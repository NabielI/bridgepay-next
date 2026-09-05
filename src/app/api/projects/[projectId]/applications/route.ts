import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const applicationSchema = z.object({
  coverLetter: z.string().max(2000).trim().optional(),
});

const applicationSelect = {
  id: true,
  coverLetter: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  freelancer: {
    select: {
      id: true,
      name: true,
      email: true,
      skills: true,
      rate: true,
      kycStatus: true,
    },
  },
};

function serializeApplication<T extends { createdAt: Date; updatedAt: Date }>(
  application: T,
) {
  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "Project tidak ditemukan." },
      { status: 404 },
    );
  }

  if (session.user.role === "client" && project.clientId !== session.user.id) {
    return NextResponse.json(
      { message: "Tidak punya akses ke daftar pelamar project ini." },
      { status: 403 },
    );
  }

  const applications = await prisma.projectApplication.findMany({
    where:
      session.user.role === "client"
        ? { projectId: project.id }
        : { projectId: project.id, freelancerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: applicationSelect,
  });

  return NextResponse.json({
    applications: applications.map(serializeApplication),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "freelancer") {
    return NextResponse.json(
      { message: "Hanya freelancer yang bisa mengajukan diri." },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;

  const body = await request.json().catch(() => ({}));
  const parsed = applicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Lamaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "Project tidak ditemukan." },
      { status: 404 },
    );
  }

  if (project.clientId === actorId) {
    return NextResponse.json(
      { message: "Client pemilik project tidak bisa apply sebagai freelancer." },
      { status: 403 },
    );
  }

  if (project.status !== "open") {
    return NextResponse.json(
      { message: "Lamaran hanya bisa dikirim ke project open." },
      { status: 409 },
    );
  }

  const existingApplication = await prisma.projectApplication.findUnique({
    where: {
      projectId_freelancerId: {
        projectId: project.id,
        freelancerId: actorId,
      },
    },
    select: applicationSelect,
  });

  if (existingApplication) {
    return NextResponse.json(
      {
        application: serializeApplication(existingApplication),
        message: "Kamu sudah pernah mengajukan diri ke project ini.",
      },
      { status: 200 },
    );
  }

  const application = await prisma.$transaction(async (tx) => {
    const createdApplication = await tx.projectApplication.create({
      data: {
        projectId: project.id,
        freelancerId: actorId,
        coverLetter: parsed.data.coverLetter || null,
      },
      select: applicationSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "application.submitted",
        entityType: "projectApplication",
        entityId: createdApplication.id,
        metadata: {
          projectId: project.id,
          freelancerId: actorId,
          status: createdApplication.status,
        },
      }),
    });

    await createNotification(tx, {
      recipientId: project.clientId,
      actorId,
      type: "application.submitted",
      title: "Lamaran baru",
      message: `${session.user.name ?? session.user.email ?? "Freelancer"} melamar ke project "${project.title}".`,
      entityType: "projectApplication",
      entityId: createdApplication.id,
      href: `/client/projects`,
    });

    return createdApplication;
  });

  return NextResponse.json(
    {
      application: serializeApplication(application),
      message: "Lamaran berhasil dikirim ke client.",
    },
    { status: 201 },
  );
}
