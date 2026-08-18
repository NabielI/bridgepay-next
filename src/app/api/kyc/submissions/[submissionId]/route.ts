import type { KycStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

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
      userId: session.user.id,
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

  const [updatedSubmission] = await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id: submission.id },
      data: {
        status: nextStatus,
        reviewNote,
        reviewerId: session.user.id,
        reviewerRole: session.user.role,
        reviewedAt: new Date(),
      },
      select: kycSubmissionSelect,
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { kycStatus: nextStatus },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    kycStatus: nextStatus,
    submission: updatedSubmission,
  });
}
