import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { convertUsdToIdr } from "@/lib/currency";
import {
  ExchangeRateUnavailableError,
  fetchUsdIdrExchangeRate,
} from "@/lib/currency";
import {
  createMidtransSnapTransaction,
  MidtransConfigurationError,
  MidtransRequestError,
} from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paymentSelect = {
  id: true,
  provider: true,
  providerOrderId: true,
  providerRedirectUrl: true,
  amount: true,
  currency: true,
  status: true,
  paidAt: true,
  createdAt: true,
};

function toPrismaJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function serializePayment<T extends { paidAt: Date | null; createdAt: Date }>(
  payment: T,
) {
  return {
    ...payment,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function createOrderId(escrowId: string) {
  return `bp-${escrowId.slice(0, 18)}-${Date.now().toString(36)}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "client") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await params;
  const actorId = session.user.id;
  const actorRole = session.user.role;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      budget: true,
      currency: true,
      clientId: true,
      client: {
        select: {
          name: true,
          email: true,
        },
      },
      escrow: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          exchangeRateSnapshot: true,
          paymentTransactions: {
            where: { status: "pending" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: paymentSelect,
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });
  }

  if (project.clientId !== actorId) {
    return NextResponse.json(
      { message: "Tidak punya akses ke payment project ini." },
      { status: 403 },
    );
  }

  if (project.escrow?.status && project.escrow.status !== "pending") {
    return NextResponse.json(
      { message: `Escrow sudah ${project.escrow.status}. Payment baru tidak diperlukan.` },
      { status: 409 },
    );
  }

  const existingPayment = project.escrow?.paymentTransactions[0];

  if (existingPayment?.providerRedirectUrl) {
    return NextResponse.json({ payment: serializePayment(existingPayment) });
  }

  let exchangeRate = project.escrow?.exchangeRateSnapshot
    ? Number(project.escrow.exchangeRateSnapshot)
    : null;

  if (!exchangeRate) {
    const latestRate = await fetchUsdIdrExchangeRate().catch((error: unknown) => {
      if (error instanceof ExchangeRateUnavailableError) {
        return null;
      }

      throw error;
    });

    if (!latestRate) {
      return NextResponse.json(
        {
          message:
            "Kurs USD-IDR belum tersedia. Payment sandbox dibatalkan agar escrow tidak berjalan tanpa snapshot kurs.",
        },
        { status: 503 },
      );
    }

    exchangeRate = latestRate.rate;
  }

  const escrow = await prisma.$transaction(async (tx) => {
    if (project.escrow) {
      if (project.escrow.exchangeRateSnapshot) {
        return project.escrow;
      }

      return tx.escrow.update({
        where: { id: project.escrow.id },
        data: {
          exchangeRateSnapshot: exchangeRate,
          exchangeRateTimestamp: new Date(),
          exchangeRateSource: "Frankfurter API USD/IDR",
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          exchangeRateSnapshot: true,
        },
      });
    }

    const createdEscrow = await tx.escrow.create({
      data: {
        projectId: project.id,
        amount: project.budget,
        currency: project.currency,
        status: "pending",
        paymentMethod: "master_account",
        exchangeRateSnapshot: exchangeRate,
        exchangeRateTimestamp: new Date(),
        exchangeRateSource: "Frankfurter API USD/IDR",
        events: {
          create: {
            actorId,
            actorRole,
            fromStatus: null,
            toStatus: "pending",
            note: "Escrow dibuat untuk project lama yang belum punya escrow.",
          },
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        exchangeRateSnapshot: true,
      },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "escrow.created",
        entityType: "escrow",
        entityId: createdEscrow.id,
        metadata: {
          projectId: project.id,
          amount: createdEscrow.amount,
          currency: createdEscrow.currency,
          status: createdEscrow.status,
          exchangeRateSnapshot:
            createdEscrow.exchangeRateSnapshot?.toString() ?? null,
          exchangeRateSource: "Frankfurter API USD/IDR",
        },
      }),
    });

    return createdEscrow;
  });

  if (escrow.status !== "pending" || !escrow.exchangeRateSnapshot) {
    return NextResponse.json(
      { message: "Escrow belum siap untuk payment sandbox." },
      { status: 409 },
    );
  }

  const amountIdr = convertUsdToIdr(escrow.amount, Number(escrow.exchangeRateSnapshot));
  const orderId = createOrderId(escrow.id);

  let snapTransaction: Awaited<ReturnType<typeof createMidtransSnapTransaction>>;

  try {
    snapTransaction = await createMidtransSnapTransaction({
      orderId,
      grossAmount: amountIdr,
      projectTitle: project.title,
      customer: project.client,
    });
  } catch (error) {
    if (error instanceof MidtransConfigurationError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    if (error instanceof MidtransRequestError) {
      return NextResponse.json({ message: error.message }, { status: 502 });
    }

    throw error;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.paymentTransaction.create({
      data: {
        escrowId: escrow.id,
        providerOrderId: orderId,
        providerToken: snapTransaction.token,
        providerRedirectUrl: snapTransaction.redirectUrl,
        amount: amountIdr,
        currency: "IDR",
        status: "pending",
        rawResponse: toPrismaJson(snapTransaction.raw),
      },
      select: paymentSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "payment.created",
        entityType: "payment",
        entityId: createdPayment.id,
        metadata: {
          provider: createdPayment.provider,
          providerOrderId: createdPayment.providerOrderId,
          projectId: project.id,
          escrowId: escrow.id,
          amount: createdPayment.amount,
          currency: createdPayment.currency,
          status: createdPayment.status,
        },
      }),
    });

    return createdPayment;
  });

  return NextResponse.json({ payment: serializePayment(payment) }, { status: 201 });
}
