import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import {
  ExchangeRateUnavailableError,
  fetchUsdIdrExchangeRate,
} from "@/lib/currency";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const projectSchema = z.object({
  title: z.string().min(3).max(120).trim(),
  description: z.string().min(10).max(4000).trim(),
  category: z.string().min(2).max(80).trim(),
  budget: z.coerce.number().int().positive().max(1_000_000),
  deadline: z.coerce.date().refine((value) => value > new Date(), {
    message: "Deadline harus tanggal ke depan.",
  }),
});

const projectSelect = Prisma.validator<Prisma.ProjectSelect>()({
    id: true,
    title: true,
    description: true,
    category: true,
    budget: true,
    currency: true,
    deadline: true,
    status: true,
    createdAt: true,
    escrow: {
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        exchangeRateSnapshot: true,
        exchangeRateTimestamp: true,
        exchangeRateSource: true,
      },
    },
    client: {
      select: {
        name: true,
        email: true,
        company: true,
      },
    },
    applications: {
      where: { status: "pending" as const },
      orderBy: { createdAt: "asc" as const },
      take: 3,
      select: {
        id: true,
        status: true,
        createdAt: true,
        freelancer: {
          select: {
            name: true,
            email: true,
            kycStatus: true,
          },
        },
      },
    },
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where:
      session.user.role === "client"
        ? { clientId: session.user.id }
        : { status: "open" },
    orderBy: { createdAt: "desc" },
    select: projectSelect,
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "client") {
    return NextResponse.json(
      { message: "Hanya client yang bisa membuat proyek." },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data proyek tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const exchangeRate = await fetchUsdIdrExchangeRate().catch((error: unknown) => {
    if (error instanceof ExchangeRateUnavailableError) {
      return null;
    }

    throw error;
  });

  if (!exchangeRate) {
    return NextResponse.json(
      {
        message:
          "Kurs USD-IDR belum tersedia. Project belum disimpan agar escrow tidak dibuat tanpa snapshot kurs.",
      },
      { status: 503 },
    );
  }

  const project = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        ...parsed.data,
        clientId: actorId,
        escrow: {
          create: {
            amount: parsed.data.budget,
            currency: "USD",
            status: "pending",
            paymentMethod: "master_account",
            exchangeRateSnapshot: exchangeRate.rate,
            exchangeRateTimestamp: exchangeRate.timestamp,
            exchangeRateSource: exchangeRate.source,
            events: {
              create: {
                actorId,
                actorRole,
                fromStatus: null,
                toStatus: "pending",
                note: "Project dibuat. Escrow menunggu pendanaan client.",
              },
            },
          },
        },
      },
      select: projectSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "project.created",
        entityType: "project",
        entityId: createdProject.id,
        metadata: {
          title: createdProject.title,
          budget: createdProject.budget,
          currency: createdProject.currency,
          deadline: createdProject.deadline.toISOString(),
          escrowId: createdProject.escrow?.id ?? null,
        },
      }),
    });

    if (createdProject.escrow) {
      await tx.activityLog.create({
        data: activityLogData({
          actorId,
          actorRole,
          action: "escrow.created",
          entityType: "escrow",
          entityId: createdProject.escrow.id,
          metadata: {
            projectId: createdProject.id,
            amount: createdProject.escrow.amount,
            currency: createdProject.escrow.currency,
            status: createdProject.escrow.status,
            exchangeRateSnapshot:
              createdProject.escrow.exchangeRateSnapshot?.toString() ?? null,
            exchangeRateSource: createdProject.escrow.exchangeRateSource,
          },
        }),
      });
    }

    return createdProject;
  });

  return NextResponse.json({ project }, { status: 201 });
}
