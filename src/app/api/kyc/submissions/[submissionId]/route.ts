import type { KycStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const reviewSchema = z.object({
  action: z.enum(["verify", "reject"]),
  note: z.string().max(500).optional(),
});

const kycSubmissionSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  status: true,
  reviewNote: true,
  reviewerRole: true,
  reviewedAt: true,
  createdAt: true,
};

function statusForAction(action: "verify" | "reject"): KycStatus {
  return action === "verify" ? "verified" : "rejected";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Aksi review KYC tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { submissionId } = await params;
  const submission = await prisma.kycSubmission.findFirst({
    where: {
      id: submissionId,
      userId: actorId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { message: "Submission KYC tidak ditemukan." },
      { status: 404 },
    );
  }

  const nextStatus = statusForAction(parsed.data.action);
  const reviewNote =
    parsed.data.note ??
    (nextStatus === "verified"
      ? "Mock approval demo: dokumen terlihat valid."
      : "Mock rejection demo: dokumen perlu diperbaiki.");

  const updatedSubmission = await prisma.$transaction(async (tx) => {
    const reviewedSubmission = await tx.kycSubmission.update({
      where: { id: submission.id },
      data: {
        status: nextStatus,
        reviewNote,
        reviewerId: actorId,
        reviewerRole: actorRole,
        reviewedAt: new Date(),
      },
      select: kycSubmissionSelect,
    });

    await tx.user.update({
      where: { id: actorId },
      data: { kycStatus: nextStatus },
      select: { id: true },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action:
          nextStatus === "verified" ? "kyc.verified" : "kyc.rejected",
        entityType: "kycSubmission",
        entityId: reviewedSubmission.id,
        metadata: {
          userId: submission.userId,
          status: reviewedSubmission.status,
          reviewNote,
        },
      }),
    });

    return reviewedSubmission;
  });

  return NextResponse.json({
    kycStatus: nextStatus,
    submission: updatedSubmission,
  });
}
