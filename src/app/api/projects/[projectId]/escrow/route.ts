import type { EscrowStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { createInvoiceForReleasedEscrow } from "@/lib/invoices";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const escrowActionSchema = z.object({
  action: z.enum(["fund", "release"]),
});

const escrowSelect = {
  id: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  exchangeRateSnapshot: true,
  exchangeRateTimestamp: true,
  exchangeRateSource: true,
  updatedAt: true,
  paymentTransactions: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
    select: {
      id: true,
      provider: true,
      providerOrderId: true,
      providerRedirectUrl: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  },
  events: {
    orderBy: { createdAt: "desc" as const },
    take: 6,
    select: {
      id: true,
      actorRole: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
};

function serializeEscrow<T extends { exchangeRateSnapshot: unknown }>(escrow: T) {
  return {
    ...escrow,
    exchangeRateSnapshot:
      escrow.exchangeRateSnapshot === null || escrow.exchangeRateSnapshot === undefined
        ? null
        : Number(escrow.exchangeRateSnapshot),
  };
}

function transitionForAction(action: "fund" | "release") {
  return action === "fund"
    ? {
        from: "pending" as EscrowStatus,
        to: "held" as EscrowStatus,
        note: "Client mendanai escrow melalui Master Account BridgePay.",
      }
    : {
        from: "held" as EscrowStatus,
        to: "released" as EscrowStatus,
        note: "Client menyetujui milestone dan melepas payout ke freelancer.",
      };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "client") {
    return NextResponse.json(
      { message: "Hanya client pemilik project yang bisa mengubah escrow." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = escrowActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Aksi escrow tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const action = parsed.data.action;

  if (action === "fund") {
    return NextResponse.json(
      {
        message:
          "Gunakan Midtrans Sandbox untuk mendanai escrow. Status escrow baru berubah menjadi held setelah payment terkonfirmasi.",
      },
      { status: 409 },
    );
  }

  const { projectId } = await params;
  const actorId = session.user.id;
  const transition = transitionForAction(action);

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        budget: true,
        currency: true,
        clientId: true,
        assignedFreelancerId: true,
        assignedFreelancer: {
          select: {
            kycStatus: true,
          },
        },
        escrow: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            exchangeRateSnapshot: true,
            exchangeRateTimestamp: true,
            exchangeRateSource: true,
          },
        },
      },
    });

    if (!project) {
      return { error: NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 }) };
    }

    if (project.clientId !== actorId) {
      return { error: NextResponse.json({ message: "Tidak punya akses ke escrow project ini." }, { status: 403 }) };
    }

    const escrow = project.escrow;

    if (!escrow) {
      return {
        error: NextResponse.json(
          { message: "Escrow belum tersedia." },
          { status: 503 },
        ),
      };
    }

    const currentEscrow = escrow;
    const assignedFreelancerId = project.assignedFreelancerId;

    if (currentEscrow.status !== transition.from) {
      return {
        error: NextResponse.json(
          {
            message: `Transisi escrow tidak valid. Status saat ini ${currentEscrow.status}.`,
          },
          { status: 409 },
        ),
      };
    }

    if (parsed.data.action === "release") {
      if (!assignedFreelancerId || !project.assignedFreelancer) {
        return {
          error: NextResponse.json(
            { message: "Freelancer belum assigned untuk project ini." },
            { status: 409 },
          ),
        };
      }

      if (
        !currentEscrow.exchangeRateSnapshot ||
        !currentEscrow.exchangeRateTimestamp
      ) {
        return {
          error: NextResponse.json(
            {
              message:
                "Snapshot kurs escrow belum tersedia. Pencairan dihentikan agar invoice dan payout IDR tidak dihitung dari data yang tidak lengkap.",
            },
            { status: 503 },
          ),
        };
      }

      if (project.assignedFreelancer.kycStatus !== "verified") {
        return {
          error: NextResponse.json(
            {
              message:
                "Verifikasi KYC diperlukan sebelum dapat menerima pencairan dana.",
            },
            { status: 403 },
          ),
        };
      }
    }

    const updatedEscrow = await tx.escrow.update({
      where: { id: currentEscrow.id },
      data: {
        status: transition.to,
        paymentMethod: "milestone_payout",
        events: {
          create: {
            actorId,
            actorRole: "client",
            fromStatus: transition.from,
            toStatus: transition.to,
            note: transition.note,
          },
        },
      },
      select: escrowSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole: "client",
        action: "escrow.released",
        entityType: "escrow",
        entityId: updatedEscrow.id,
        metadata: {
          projectId: project.id,
          amount: updatedEscrow.amount,
          currency: updatedEscrow.currency,
          fromStatus: transition.from,
          toStatus: transition.to,
          paymentMethod: updatedEscrow.paymentMethod,
          exchangeRateSnapshot:
            updatedEscrow.exchangeRateSnapshot?.toString() ?? null,
          exchangeRateSource: updatedEscrow.exchangeRateSource,
        },
      }),
    });

    const invoiceFreelancerId = assignedFreelancerId;
    const invoiceExchangeRateSnapshot = updatedEscrow.exchangeRateSnapshot;
    const invoiceExchangeRateTimestamp = updatedEscrow.exchangeRateTimestamp;

    if (
      !invoiceFreelancerId ||
      !invoiceExchangeRateSnapshot ||
      !invoiceExchangeRateTimestamp
    ) {
      return {
        error: NextResponse.json(
          {
            message:
              "Data invoice belum lengkap. Pencairan dihentikan agar invoice payout tidak dibuat dari data escrow yang tidak valid.",
          },
          { status: 503 },
        ),
      };
    }

    const invoice = await createInvoiceForReleasedEscrow(tx, {
      projectId: project.id,
      escrowId: updatedEscrow.id,
      freelancerId: invoiceFreelancerId,
      clientId: project.clientId,
      amountUsd: updatedEscrow.amount,
      exchangeRateSnapshot: invoiceExchangeRateSnapshot,
      exchangeRateTimestamp: invoiceExchangeRateTimestamp,
      exchangeRateSource: updatedEscrow.exchangeRateSource,
    });

    if (invoice.created) {
      await tx.activityLog.create({
        data: activityLogData({
          actorId,
          actorRole: "client",
          action: "invoice.issued",
          entityType: "invoice",
          entityId: invoice.id,
          metadata: {
            projectId: project.id,
            escrowId: updatedEscrow.id,
            invoiceNumber: invoice.invoiceNumber,
            freelancerId: invoiceFreelancerId,
            clientId: project.clientId,
            amountUsd: updatedEscrow.amount,
            exchangeRateSnapshot:
              updatedEscrow.exchangeRateSnapshot?.toString() ?? null,
            amountIdr: invoice.amountIdr,
            estimatedTaxIdr: invoice.estimatedTaxIdr,
            netEstimatedPayoutIdr: invoice.netEstimatedPayoutIdr,
          },
        }),
      });
    }

    await createNotifications(tx, [
      {
        recipientId: project.clientId,
        actorId,
        type: "escrow.released",
        title: "Escrow released",
        message: `Dana escrow untuk project "${project.title}" sudah dilepas ke freelancer.`,
        entityType: "escrow",
        entityId: updatedEscrow.id,
        href: `/workspace/${project.id}`,
        allowSelf: true,
      },
      ...(assignedFreelancerId
        ? [
            {
              recipientId: assignedFreelancerId,
              actorId,
              type: "escrow.released",
              title: "Payout escrow dilepas",
              message: `Dana escrow untuk project "${project.title}" sudah dilepas ke kamu.`,
              entityType: "escrow",
              entityId: updatedEscrow.id,
              href: `/workspace/${project.id}`,
            },
          ]
        : []),
    ]);

    return { escrow: updatedEscrow, invoice };
  });

  if (result.error) {
    return result.error;
  }

  return NextResponse.json({
    escrow: result.escrow ? serializeEscrow(result.escrow) : null,
    invoice: result.invoice ?? null,
  });
}
