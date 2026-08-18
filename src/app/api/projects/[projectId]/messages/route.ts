import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { canAccessProjectWorkspace } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const messageSchema = z.object({
  body: z.string().min(1).max(2000).trim(),
});

const messageSelect = {
  id: true,
  body: true,
  translatedBody: true,
  senderRole: true,
  createdAt: true,
  sender: {
    select: {
      name: true,
      email: true,
    },
  },
};

function translateMessage(body: string) {
  const normalized = body.toLowerCase();

  if (normalized.includes("milestone")) {
    return "Mari kita bahas milestone proyek ini dan status berikutnya.";
  }

  if (normalized.includes("revisi") || normalized.includes("revision")) {
    return "The revision notes have been received and will be reviewed.";
  }

  return `Translated draft: ${body}`;
}

async function getAccessibleProject(projectId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return { error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }) };
  }

  const userId = session.user.id;
  const role = session.user.role;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
      status: true,
    },
  });

  if (!project) {
    return { error: NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 }) };
  }

  if (!canAccessProjectWorkspace(project, userId, role)) {
    return { error: NextResponse.json({ message: "Tidak punya akses ke project ini." }, { status: 403 }) };
  }

  return { project, userId, role };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await getAccessibleProject(projectId);

  if (access.error) {
    return access.error;
  }

  const messages = await prisma.message.findMany({
    where: { projectId: access.project.id },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await getAccessibleProject(projectId);

  if (access.error) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Pesan tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const message = await prisma.message.create({
    data: {
      projectId: access.project.id,
      senderId: access.userId,
      senderRole: access.role,
      body: parsed.data.body,
      translatedBody: translateMessage(parsed.data.body),
    },
    select: messageSelect,
  });

  return NextResponse.json({ message }, { status: 201 });
}
