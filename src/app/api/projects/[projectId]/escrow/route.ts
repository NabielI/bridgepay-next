import type { EscrowStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import {
  ExchangeRateUnavailableError,
  fetchUsdIdrExchangeRate,
  type UsdIdrExchangeRate,
} from "@/lib/currency";
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

  const { projectId } = await params;
  const actorId = session.user.id;
  const transition = transitionForAction(parsed.data.action);
  let exchangeRate: UsdIdrExchangeRate | null = null;

  if (parsed.data.action === "fund") {
    const existingEscrow = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        clientId: true,
        escrow: {
          select: {
            exchangeRateSnapshot: true,
          },
        },
      },
    });

    if (existingEscrow?.clientId === actorId && !existingEscrow.escrow?.exchangeRateSnapshot) {
      exchangeRate = await fetchUsdIdrExchangeRate().catch((error: unknown) => {
        if (error instanceof ExchangeRateUnavailableError) {
          return null;
        }

        throw error;
      });

      if (!exchangeRate) {
        return NextResponse.json(
          {
            message:
              "Kurs USD-IDR belum tersedia. Fund escrow dibatalkan agar nilai payout tidak berjalan tanpa snapshot kurs.",
          },
          { status: 503 },
        );
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        budget: true,
        currency: true,
        clientId: true,
        assignedFreelancer: {
          select: {
            kycStatus: true,
          },
        },
        escrow: {
          select: {
            id: true,
            status: true,
            exchangeRateSnapshot: true,
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

    let escrow = project.escrow;

    if (!escrow) {
      if (!exchangeRate) {
        return {
          error: NextResponse.json(
            {
              message:
                "Kurs USD-IDR belum tersedia. Escrow belum bisa dibuat tanpa snapshot kurs.",
            },
            { status: 503 },
          ),
        };
      }

      escrow = await tx.escrow.create({
        data: {
          projectId: project.id,
          amount: project.budget,
          currency: project.currency,
          status: "pending",
          paymentMethod: "master_account",
          exchangeRateSnapshot: exchangeRate.rate,
          exchangeRateTimestamp: exchangeRate.timestamp,
          exchangeRateSource: exchangeRate.source,
          events: {
            create: {
              actorId,
              actorRole: "client",
              fromStatus: null,
              toStatus: "pending",
              note: "Escrow dibuat untuk project lama yang belum punya escrow.",
            },
          },
        },
        select: {
          id: true,
          status: true,
          exchangeRateSnapshot: true,
        },
      });

      await tx.activityLog.create({
        data: activityLogData({
          actorId,
          actorRole: "client",
          action: "escrow.created",
          entityType: "escrow",
          entityId: escrow.id,
          metadata: {
            projectId: project.id,
            amount: project.budget,
            currency: project.currency,
            status: escrow.status,
            exchangeRateSnapshot: escrow.exchangeRateSnapshot?.toString() ?? null,
            exchangeRateSource: exchangeRate.source,
          },
        }),
      });
    }

    if (!escrow) {
      return {
        error: NextResponse.json(
          { message: "Escrow belum tersedia." },
          { status: 503 },
        ),
      };
    }

    const currentEscrow = escrow;

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
      if (!project.assignedFreelancer) {
        return {
          error: NextResponse.json(
            { message: "Freelancer belum assigned untuk project ini." },
            { status: 409 },
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
        paymentMethod:
          parsed.data.action === "release"
            ? "milestone_payout"
            : "master_account",
        ...(parsed.data.action === "fund" &&
        !currentEscrow.exchangeRateSnapshot &&
        exchangeRate
          ? {
              exchangeRateSnapshot: exchangeRate.rate,
              exchangeRateTimestamp: exchangeRate.timestamp,
              exchangeRateSource: exchangeRate.source,
            }
          : {}),
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
        action:
          parsed.data.action === "fund" ? "escrow.funded" : "escrow.released",
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

    return { escrow: updatedEscrow };
  });

  if (result.error) {
    return result.error;
  }

  return NextResponse.json({
    escrow: result.escrow ? serializeEscrow(result.escrow) : null,
  });
}
