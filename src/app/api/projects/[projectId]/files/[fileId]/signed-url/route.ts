import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { canAccessProjectWorkspace } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseAdmin,
  PROJECT_FILES_BUCKET,
} from "@/lib/supabase-storage";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { projectId, fileId } = await params;
  const projectFile = await prisma.projectFile.findFirst({
    where: {
      id: fileId,
      projectId,
    },
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      project: {
        select: {
          id: true,
          clientId: true,
          status: true,
        },
      },
    },
  });

  if (!projectFile) {
    return NextResponse.json(
      { message: "File project tidak ditemukan." },
      { status: 404 },
    );
  }

  if (
    !canAccessProjectWorkspace(
      projectFile.project,
      session.user.id,
      session.user.role,
    )
  ) {
    return NextResponse.json(
      { message: "Tidak punya akses ke file project ini." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  const expiresIn = 60 * 10;
  const { data, error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(projectFile.storagePath, expiresIn, {
      download: projectFile.fileName,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { message: `Signed URL gagal dibuat: ${error?.message ?? "unknown"}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    expiresIn,
  });
}
