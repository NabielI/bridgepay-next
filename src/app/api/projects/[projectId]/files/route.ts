import type { ProjectFileKind } from "@prisma/client";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { canAccessProjectWorkspace } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import {
  ensureProjectFilesBucket,
  isAllowedProjectFile,
  MAX_PROJECT_FILE_SIZE,
  PROJECT_FILES_BUCKET,
  sanitizeFileName,
} from "@/lib/supabase-storage";

export const runtime = "nodejs";

const fileKindSchema = z.enum(["deliverable", "reference"]);

const fileSelect = {
  id: true,
  kind: true,
  fileName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploaderRole: true,
  uploader: {
    select: {
      name: true,
      email: true,
    },
  },
};

async function getProjectAccess(projectId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return { error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }) };
  }

  const userId = session.user.id;
  const role = session.user.role;

  if (role !== "client" && role !== "freelancer") {
    return {
      error: NextResponse.json(
        { message: "Admin tidak bisa mengakses file workspace project." },
        { status: 403 },
      ),
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
      assignedFreelancerId: true,
      status: true,
    },
  });

  if (!project) {
    return { error: NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 }) };
  }

  if (!canAccessProjectWorkspace(project, userId, role)) {
    return { error: NextResponse.json({ message: "Tidak punya akses ke file project ini." }, { status: 403 }) };
  }

  return { project, userId, role };
}

function expectedKindForRole(role: "client" | "freelancer"): ProjectFileKind {
  return role === "client" ? "reference" : "deliverable";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);

  if (access.error) {
    return access.error;
  }

  const files = await prisma.projectFile.findMany({
    where: { projectId: access.project.id },
    orderBy: { createdAt: "desc" },
    select: fileSelect,
  });

  return NextResponse.json({ files });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);

  if (access.error) {
    return access.error;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { message: "Form upload tidak valid." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const parsedKind = fileKindSchema.safeParse(formData.get("kind"));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "File wajib dilampirkan." },
      { status: 400 },
    );
  }

  if (!parsedKind.success) {
    return NextResponse.json(
      { message: "Jenis file project tidak valid." },
      { status: 400 },
    );
  }

  const expectedKind = expectedKindForRole(access.role);

  if (parsedKind.data !== expectedKind) {
    return NextResponse.json(
      {
        message:
          access.role === "client"
            ? "Client hanya bisa upload reference file."
            : "Freelancer hanya bisa upload deliverable.",
      },
      { status: 403 },
    );
  }

  if (file.size > MAX_PROJECT_FILE_SIZE) {
    return NextResponse.json(
      { message: "Ukuran file maksimal 20 MB." },
      { status: 400 },
    );
  }

  if (!isAllowedProjectFile(file)) {
    return NextResponse.json(
      {
        message:
          "Tipe file tidak didukung. Gunakan zip, pdf, png, jpg, webp, fig, doc, atau docx.",
      },
      { status: 400 },
    );
  }

  const safeFileName = sanitizeFileName(file.name) || "project-file";
  const storagePath = `${access.project.id}/${parsedKind.data}/${Date.now()}-${randomUUID()}-${safeFileName}`;
  const supabase = await ensureProjectFilesBucket();
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { message: `Upload Storage gagal: ${uploadError.message}` },
      { status: 502 },
    );
  }

  const projectFile = await prisma.$transaction(async (tx) => {
    const createdFile = await tx.projectFile.create({
      data: {
        projectId: access.project.id,
        uploaderId: access.userId,
        uploaderRole: access.role,
        kind: parsedKind.data,
        fileName: file.name,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
      select: fileSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId: access.userId,
        actorRole: access.role,
        action: "projectFile.uploaded",
        entityType: "projectFile",
        entityId: createdFile.id,
        metadata: {
          projectId: access.project.id,
          kind: createdFile.kind,
          fileName: createdFile.fileName,
          mimeType: createdFile.mimeType,
          size: createdFile.size,
        },
      }),
    });

    return createdFile;
  });

  return NextResponse.json({ file: projectFile }, { status: 201 });
}
