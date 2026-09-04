import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseAdmin,
  KYC_DOCUMENTS_BUCKET,
} from "@/lib/supabase-storage";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { submissionId } = await params;
  const submission = await prisma.kycSubmission.findFirst({
    where: {
      id: submissionId,
      ...(session.user.role === "admin" ? {} : { userId: session.user.id }),
    },
    select: {
      id: true,
      fileName: true,
      storagePath: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { message: "Submission KYC tidak ditemukan." },
      { status: 404 },
    );
  }

  const supabase = getSupabaseAdmin();
  const expiresIn = 60 * 10;
  const { data, error } = await supabase.storage
    .from(KYC_DOCUMENTS_BUCKET)
    .createSignedUrl(submission.storagePath, expiresIn, {
      download: submission.fileName,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: `Signed URL KYC gagal dibuat: ${error?.message ?? "unknown"}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    expiresIn,
  });
}
