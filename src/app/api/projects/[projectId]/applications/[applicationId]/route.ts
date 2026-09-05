import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { authOptions } from "@/lib/auth";
import {
  createNotification,
  createNotifications,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const reviewSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

const reviewedApplicationSelect = {
  id: true,
  status: true,
  coverLetter: true,
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
  project: {
    select: {
      id: true,
      title: true,
      status: true,
      assignedFreelancerId: true,
    },
  },
};

function serializeReviewedApplication<
  T extends { createdAt: Date; updatedAt: Date },
>(application: T) {
  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; applicationId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "client") {
    return NextResponse.json(
      { message: "Hanya client pemilik project yang bisa review lamaran." },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const actorRole = session.user.role;
  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Aksi review lamaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { projectId, applicationId } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.projectApplication.findFirst({
      where: {
        id: applicationId,
        projectId,
      },
      select: {
        id: true,
        projectId: true,
        freelancerId: true,
        status: true,
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            status: true,
            assignedFreelancerId: true,
          },
        },
      },
    });

    if (!application) {
      return {
        error: NextResponse.json(
          { message: "Lamaran tidak ditemukan." },
          { status: 404 },
        ),
      };
    }

    if (application.project.clientId !== actorId) {
      return {
        error: NextResponse.json(
          { message: "Tidak punya akses review lamaran project ini." },
          { status: 403 },
        ),
      };
    }

    if (parsed.data.action === "reject") {
      if (application.status === "accepted") {
        return {
          error: NextResponse.json(
            { message: "Lamaran accepted tidak bisa ditolak ulang." },
            { status: 409 },
          ),
        };
      }

      const rejectedApplication = await tx.projectApplication.update({
        where: { id: application.id },
        data: { status: "rejected" },
        select: reviewedApplicationSelect,
      });

      await tx.activityLog.create({
        data: activityLogData({
          actorId,
          actorRole,
          action: "application.rejected",
          entityType: "projectApplication",
          entityId: rejectedApplication.id,
          metadata: {
            projectId,
            freelancerId: application.freelancerId,
            status: rejectedApplication.status,
          },
        }),
      });

      await createNotification(tx, {
        recipientId: application.freelancerId,
        actorId,
        type: "application.rejected",
        title: "Lamaran ditolak",
        message: `Lamaran kamu untuk project "${application.project.title}" belum diterima.`,
        entityType: "projectApplication",
        entityId: rejectedApplication.id,
        href: "/freelancer/projects",
      });

      return { application: rejectedApplication };
    }

    if (application.project.status !== "open") {
      return {
        error: NextResponse.json(
          {
            message:
              "Project sudah tidak open. Tidak bisa menerima freelancer baru.",
          },
          { status: 409 },
        ),
      };
    }

    if (application.status !== "pending") {
      return {
        error: NextResponse.json(
          { message: `Lamaran berstatus ${application.status}.` },
          { status: 409 },
        ),
      };
    }

    await tx.project.update({
      where: { id: application.projectId },
      data: {
        status: "active",
        assignedFreelancerId: application.freelancerId,
      },
      select: { id: true },
    });

    const autoRejectedApplications = await tx.projectApplication.findMany({
      where: {
        projectId: application.projectId,
        id: { not: application.id },
        status: "pending",
      },
      select: {
        id: true,
        freelancerId: true,
      },
    });

    await tx.projectApplication.updateMany({
      where: {
        projectId: application.projectId,
        id: { not: application.id },
        status: "pending",
      },
      data: { status: "rejected" },
    });

    const acceptedApplication = await tx.projectApplication.update({
      where: { id: application.id },
      data: { status: "accepted" },
      select: reviewedApplicationSelect,
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "application.accepted",
        entityType: "projectApplication",
        entityId: acceptedApplication.id,
        metadata: {
          projectId,
          freelancerId: application.freelancerId,
          projectStatus: acceptedApplication.project.status,
          assignedFreelancerId: acceptedApplication.project.assignedFreelancerId,
        },
      }),
    });

    await createNotification(tx, {
      recipientId: application.freelancerId,
      actorId,
      type: "application.accepted",
      title: "Lamaran diterima",
      message: `Lamaran kamu untuk project "${application.project.title}" diterima client.`,
      entityType: "projectApplication",
      entityId: acceptedApplication.id,
      href: "/freelancer/projects",
    });

    await createNotifications(
      tx,
      autoRejectedApplications.map((rejected) => ({
        recipientId: rejected.freelancerId,
        actorId,
        type: "application.rejected",
        title: "Lamaran ditolak",
        message: `Lamaran kamu untuk project "${application.project.title}" belum diterima.`,
        entityType: "projectApplication",
        entityId: rejected.id,
        href: "/freelancer/projects",
      })),
    );

    return { application: acceptedApplication };
  });

  if (result.error) {
    return result.error;
  }

  return NextResponse.json({
    application: result.application
      ? serializeReviewedApplication(result.application)
      : null,
  });
}
