import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureKycDocumentsBucket,
  isAllowedKycFile,
  KYC_DOCUMENTS_BUCKET,
  MAX_KYC_FILE_SIZE,
  sanitizeFileName,
} from "@/lib/supabase-storage";

export const runtime = "nodejs";

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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      kycStatus: true,
      kycSubmissions: {
        orderBy: { createdAt: "desc" },
        select: kycSubmissionSelect,
      },
    },
  });

  return NextResponse.json({
    kycStatus: user?.kycStatus ?? "pending",
    submissions: user?.kycSubmissions ?? [],
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { message: "Form upload KYC tidak valid." },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "Dokumen identitas wajib dilampirkan." },
      { status: 400 },
    );
  }

  if (file.size > MAX_KYC_FILE_SIZE) {
    return NextResponse.json(
      { message: "Ukuran dokumen KYC maksimal 10 MB." },
      { status: 400 },
    );
  }

  if (!isAllowedKycFile(file)) {
    return NextResponse.json(
      { message: "Tipe dokumen KYC harus PDF, PNG, JPG, JPEG, atau WebP." },
      { status: 400 },
    );
  }

  const safeFileName = sanitizeFileName(file.name) || "kyc-document";
  const storagePath = `${session.user.id}/${Date.now()}-${randomUUID()}-${safeFileName}`;
  const supabase = await ensureKycDocumentsBucket();
  const { error: uploadError } = await supabase.storage
    .from(KYC_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: `Upload dokumen KYC gagal: ${uploadError.message}` },
      { status: 502 },
    );
  }

  const [submission] = await prisma.$transaction([
    prisma.kycSubmission.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        storagePath,
        mimeType: file.type,
        size: file.size,
        status: "pending",
      },
      select: kycSubmissionSelect,
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { kycStatus: "pending" },
      select: { id: true },
    }),
  ]);

  return NextResponse.json(
    {
      kycStatus: "pending",
      submission,
    },
    { status: 201 },
  );
}
