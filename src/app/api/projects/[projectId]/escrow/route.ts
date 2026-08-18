import type { EscrowStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
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

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        budget: true,
        currency: true,
        clientId: true,
        escrow: {
          select: {
            id: true,
            status: true,
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
      escrow = await tx.escrow.create({
        data: {
          projectId: project.id,
          amount: project.budget,
          currency: project.currency,
          status: "pending",
          paymentMethod: "master_account",
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
        },
      });
    }

    if (escrow.status !== transition.from) {
      return {
        error: NextResponse.json(
          {
            message: `Transisi escrow tidak valid. Status saat ini ${escrow.status}.`,
          },
          { status: 409 },
        ),
      };
    }

    const updatedEscrow = await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: transition.to,
        paymentMethod:
          parsed.data.action === "release"
            ? "milestone_payout"
            : "master_account",
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

    return { escrow: updatedEscrow };
  });

  if (result.error) {
    return result.error;
  }

  return NextResponse.json({ escrow: result.escrow });
}
