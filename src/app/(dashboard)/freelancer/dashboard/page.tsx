import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { PublishedGig } from "@/components/dashboard/GigBuilder";
import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import type { GeneratedGigPackage } from "@/lib/gig-generator";
import { prisma } from "@/lib/prisma";

export default async function FreelancerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "freelancer") {
    redirect(dashboardPathForRole(session.user.role));
  }

  const [profile, projects, gigs] = await Promise.all([
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
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        budget: true,
        currency: true,
        deadline: true,
        status: true,
        escrow: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethod: true,
          },
        },
        client: {
          select: {
            name: true,
            email: true,
            company: true,
          },
        },
      },
    }),
    prisma.gig.findMany({
      where: { freelancerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        skills: true,
        startingPrice: true,
        currency: true,
        packages: true,
        deliverables: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <DashboardShell
      role="freelancer"
      session={session}
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
      }))}
      gigs={gigs.map((gig) => ({
        ...gig,
        packages: gig.packages as unknown as GeneratedGigPackage[],
        createdAt: gig.createdAt.toISOString(),
        updatedAt: gig.updatedAt.toISOString(),
      })) satisfies PublishedGig[]}
    />
  );
}
