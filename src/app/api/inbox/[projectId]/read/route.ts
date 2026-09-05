import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { canAccessProjectWorkspace } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "client" && session.user.role !== "freelancer") {
    return NextResponse.json(
      { message: "Admin tidak memiliki inbox project." },
      { status: 403 },
    );
  }

  const { projectId } = await params;
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
    return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });
  }

  if (!canAccessProjectWorkspace(project, session.user.id, session.user.role)) {
    return NextResponse.json(
      { message: "Tidak punya akses ke percakapan project ini." },
      { status: 403 },
    );
  }

  const readState = await prisma.conversationReadState.upsert({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId: project.id,
      },
    },
    create: {
      userId: session.user.id,
      projectId: project.id,
      lastReadAt: new Date(),
    },
    update: {
      lastReadAt: new Date(),
    },
    select: {
      projectId: true,
      lastReadAt: true,
    },
  });

  return NextResponse.json({
    readState: {
      projectId: readState.projectId,
      lastReadAt: readState.lastReadAt.toISOString(),
    },
  });
}
