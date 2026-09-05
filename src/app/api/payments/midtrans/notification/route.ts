import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { activityLogData } from "@/lib/activity-log";
import {
  getMidtransNotificationValue,
  getMidtransPaymentStatus,
  MidtransConfigurationError,
  verifyMidtransNotificationSignature,
} from "@/lib/midtrans";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toPrismaJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  const notification = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!notification) {
    return NextResponse.json(
      { message: "Payload Midtrans tidak valid." },
      { status: 400 },
    );
  }

  try {
    if (!verifyMidtransNotificationSignature(notification)) {
      return NextResponse.json(
        { message: "Signature Midtrans tidak valid." },
        { status: 401 },
      );
    }
  } catch (error) {
    if (error instanceof MidtransConfigurationError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    throw error;
  }

  const orderId = getMidtransNotificationValue(notification, "order_id");
  const grossAmount = Number(
    getMidtransNotificationValue(notification, "gross_amount"),
  );

  if (!orderId || !Number.isFinite(grossAmount)) {
    return NextResponse.json(
      { message: "Order ID atau nominal Midtrans tidak valid." },
      { status: 400 },
    );
  }

  const payment = await prisma.paymentTransaction.findUnique({
    where: { providerOrderId: orderId },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      providerOrderId: true,
      escrow: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          project: {
            select: {
              id: true,
              title: true,
              clientId: true,
              assignedFreelancerId: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json(
      { message: "Transaksi payment tidak ditemukan." },
      { status: 404 },
    );
  }

  if (Math.round(grossAmount) !== payment.amount) {
    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: "amount_mismatch",
        rawNotification: toPrismaJson(notification),
      },
    });

    return NextResponse.json(
      { message: "Nominal payment tidak cocok dengan transaksi escrow." },
      { status: 409 },
    );
  }

  const nextStatus = getMidtransPaymentStatus(notification);
  const providerTransactionId = getMidtransNotificationValue(
    notification,
    "transaction_id",
  );
  const shouldHoldEscrow =
    nextStatus === "settled" && payment.escrow.status === "pending";
  const statusChanged = payment.status !== nextStatus;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        rawNotification: toPrismaJson(notification),
        paidAt: nextStatus === "settled" ? new Date() : undefined,
        ...(providerTransactionId ? { providerTransactionId } : {}),
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        providerOrderId: true,
      },
    });

    if (statusChanged) {
      await tx.activityLog.create({
        data: activityLogData({
          actorId: payment.escrow.project.clientId,
          actorRole: "client",
          action:
            nextStatus === "settled" ? "payment.settled" : "payment.updated",
          entityType: "payment",
          entityId: payment.id,
          metadata: {
            provider: "midtrans",
            providerOrderId: payment.providerOrderId,
            projectId: payment.escrow.project.id,
            escrowId: payment.escrow.id,
            fromStatus: payment.status,
            toStatus: nextStatus,
            amount: payment.amount,
            currency: payment.currency,
          },
        }),
      });
    }

    if (!shouldHoldEscrow) {
      return {
        payment: updatedPayment,
        escrowStatus: payment.escrow.status,
      };
    }

    const updatedEscrow = await tx.escrow.update({
      where: { id: payment.escrow.id },
      data: {
        status: "held",
        paymentMethod: "midtrans_snap",
        events: {
          create: {
            actorId: payment.escrow.project.clientId,
            actorRole: "client",
            fromStatus: "pending",
            toStatus: "held",
            note: "Midtrans Sandbox mengonfirmasi pembayaran client. Dana escrow ditahan BridgePay.",
          },
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId: payment.escrow.project.clientId,
        actorRole: "client",
        action: "escrow.funded",
        entityType: "escrow",
        entityId: payment.escrow.id,
        metadata: {
          provider: "midtrans",
          providerOrderId: payment.providerOrderId,
          paymentId: payment.id,
          projectId: payment.escrow.project.id,
          amount: payment.escrow.amount,
          currency: payment.escrow.currency,
          paymentAmount: payment.amount,
          paymentCurrency: payment.currency,
          fromStatus: "pending",
          toStatus: "held",
          paymentMethod: "midtrans_snap",
        },
      }),
    });

    await createNotifications(tx, [
      {
        recipientId: payment.escrow.project.clientId,
        actorId: payment.escrow.project.clientId,
        type: "escrow.funded",
        title: "Escrow funded",
        message: `Dana escrow untuk project "${payment.escrow.project.title}" sudah berhasil ditahan BridgePay.`,
        entityType: "escrow",
        entityId: payment.escrow.id,
        href: `/workspace/${payment.escrow.project.id}`,
        allowSelf: true,
      },
      ...(payment.escrow.project.assignedFreelancerId
        ? [
            {
              recipientId: payment.escrow.project.assignedFreelancerId,
              actorId: payment.escrow.project.clientId,
              type: "escrow.funded",
              title: "Escrow funded",
              message: `Dana escrow untuk project "${payment.escrow.project.title}" sudah didanai client dan ditahan BridgePay.`,
              entityType: "escrow",
              entityId: payment.escrow.id,
              href: `/workspace/${payment.escrow.project.id}`,
            },
          ]
        : []),
    ]);

    return {
      payment: updatedPayment,
      escrowStatus: updatedEscrow.status,
    };
  });

  return NextResponse.json({
    message: "Notification Midtrans diproses.",
    payment: result.payment,
    escrowStatus: result.escrowStatus,
  });
}
