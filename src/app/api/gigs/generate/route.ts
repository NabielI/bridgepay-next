import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { generateGigDraft } from "@/lib/gig-generator";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const gigGenerateSchema = z.object({
  brief: z.string().min(20).max(1200).trim(),
  category: z.string().min(2).max(80).trim(),
  skills: z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : value.split(","))
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  targetClient: z.string().max(120).optional(),
  tone: z
    .enum(["professional", "friendly", "premium", "fast"])
    .default("professional"),
  startingPrice: z.coerce.number().int().min(50).max(100_000),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "freelancer") {
    return NextResponse.json(
      { message: "Hanya freelancer yang bisa memakai Gig Builder AI." },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;

  const body = await request.json().catch(() => null);
  const parsed = gigGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Input Gig Builder tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const generated = generateGigDraft({
    ...parsed.data,
    currency: "USD",
  });
  const draft = await prisma.$transaction(async (tx) => {
    const createdDraft = await tx.gigDraft.create({
      data: {
        freelancerId: actorId,
        brief: parsed.data.brief,
        category: parsed.data.category,
        skills: parsed.data.skills,
        targetClient: parsed.data.targetClient,
        tone: parsed.data.tone,
        startingPrice: generated.startingPrice,
        currency: generated.currency,
        generated: generated as unknown as Prisma.InputJsonValue,
        generationMode: "template",
      },
      select: {
        id: true,
        brief: true,
        category: true,
        skills: true,
        targetClient: true,
        tone: true,
        startingPrice: true,
        currency: true,
        generated: true,
        generationMode: true,
        createdAt: true,
      },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "gigDraft.generated",
        entityType: "gigDraft",
        entityId: createdDraft.id,
        metadata: {
          category: createdDraft.category,
          startingPrice: createdDraft.startingPrice,
          currency: createdDraft.currency,
          generationMode: createdDraft.generationMode,
        },
      }),
    });

    return createdDraft;
  });

  return NextResponse.json({
    draft: {
      ...draft,
      createdAt: draft.createdAt.toISOString(),
    },
  });
}
