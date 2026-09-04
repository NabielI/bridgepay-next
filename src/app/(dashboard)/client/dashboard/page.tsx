import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "client") {
    redirect(dashboardPathForRole(session.user.role));
  }

  const [profile, projects] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        role: true,
        kycStatus: true,
        skills: true,
        rate: true,
        company: true,
        budget: true,
        kycSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            status: true,
            reviewNote: true,
            reviewerRole: true,
            reviewedAt: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        budget: true,
        currency: true,
        deadline: true,
        status: true,
        createdAt: true,
        escrow: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethod: true,
          },
        },
        applications: {
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
          take: 3,
          select: {
            id: true,
            status: true,
            createdAt: true,
            freelancer: {
              select: {
                name: true,
                email: true,
                kycStatus: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <ClientDashboard
      email={session.user.email}
      profile={{
        ...profile,
        kycSubmissions: profile.kycSubmissions.map((submission) => ({
          ...submission,
          reviewedAt: submission.reviewedAt?.toISOString() ?? null,
          createdAt: submission.createdAt.toISOString(),
        })),
      }}
      projects={projects.map((project) => ({
        ...project,
        deadline: project.deadline.toISOString(),
        createdAt: project.createdAt.toISOString(),
        applications: project.applications.map((application) => ({
          ...application,
          createdAt: application.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
