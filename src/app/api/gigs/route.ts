import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const packageSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  price: z.coerce.number().int().min(50).max(100_000),
  timeline: z.string().min(2).max(80).trim(),
  description: z.string().min(10).max(500).trim(),
  deliverables: z.array(z.string().min(2).max(160).trim()).min(1).max(8),
});

const gigPublishSchema = z.object({
  draftId: z.string().optional(),
  title: z.string().min(8).max(160).trim(),
  description: z.string().min(30).max(4000).trim(),
  category: z.string().min(2).max(80).trim(),
  skills: z.array(z.string().min(2).max(60).trim()).min(1).max(8),
  startingPrice: z.coerce.number().int().min(50).max(100_000),
  currency: z.string().default("USD"),
  packages: z.array(packageSchema).min(1).max(3),
  deliverables: z.array(z.string().min(2).max(160).trim()).min(1).max(12),
});

const gigSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  skills: true,
  startingPrice: true,
  currency: true,
  packages: true,
  deliverables: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const gigs = await prisma.gig.findMany({
    where:
      session.user.role === "freelancer"
        ? { freelancerId: session.user.id }
        : { status: "published" },
    orderBy: { updatedAt: "desc" },
    select: gigSelect,
  });

  return NextResponse.json({
    gigs: gigs.map((gig) => ({
      ...gig,
      createdAt: gig.createdAt.toISOString(),
      updatedAt: gig.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "freelancer") {
    return NextResponse.json(
      { message: "Hanya freelancer yang bisa publish gig." },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;

  const body = await request.json().catch(() => null);
  const parsed = gigPublishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data gig tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const draft = parsed.data.draftId
    ? await prisma.gigDraft.findFirst({
        where: {
          id: parsed.data.draftId,
          freelancerId: actorId,
        },
        select: { id: true },
      })
    : null;

  if (parsed.data.draftId && !draft) {
    return NextResponse.json(
      { message: "Draft gig tidak ditemukan." },
      { status: 404 },
    );
  }

  const gig = await prisma.$transaction(async (tx) => {
    const createdGig = await tx.gig.create({
      data: {
        freelancerId: actorId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        skills: parsed.data.skills,
        startingPrice: parsed.data.startingPrice,
        currency: parsed.data.currency,
        packages: parsed.data.packages as unknown as Prisma.InputJsonValue,
        deliverables: parsed.data.deliverables,
        status: "published",
      },
      select: gigSelect,
    });

    if (draft) {
      await tx.gigDraft.update({
        where: { id: draft.id },
        data: { gigId: createdGig.id },
        select: { id: true },
      });
    }

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "gig.published",
        entityType: "gig",
        entityId: createdGig.id,
        metadata: {
          draftId: draft?.id ?? null,
          category: createdGig.category,
          startingPrice: createdGig.startingPrice,
          currency: createdGig.currency,
          status: createdGig.status,
        },
      }),
    });

    return createdGig;
  });

  return NextResponse.json(
    {
      gig: {
        ...gig,
        createdAt: gig.createdAt.toISOString(),
        updatedAt: gig.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
