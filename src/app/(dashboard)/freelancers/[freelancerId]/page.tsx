import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { FreelancerCvProfile } from "@/components/freelancers/FreelancerCvProfile";
import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export default async function FreelancerCvPage({
  params,
}: {
  params: Promise<{ freelancerId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "client" && session.user.role !== "freelancer") {
    redirect(dashboardPathForRole(session.user.role));
  }

  const { freelancerId } = await params;
  const freelancer = await prisma.user.findFirst({
    where: {
      id: freelancerId,
      role: "freelancer",
    },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      skills: true,
      rate: true,
      kycStatus: true,
      freelancerExperiences: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          company: true,
          position: true,
          period: true,
          description: true,
        },
      },
      portfolioProjects: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          link: true,
          imageUrl: true,
        },
      },
      freelancerLanguages: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          language: true,
          level: true,
        },
      },
      freelancerCertifications: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          issuer: true,
          issueDate: true,
          credentialUrl: true,
        },
      },
      gigs: {
        where: { status: "published" },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          category: true,
          skills: true,
          startingPrice: true,
          currency: true,
        },
      },
    },
  });

  if (!freelancer) {
    notFound();
  }

  return (
    <FreelancerCvProfile
      freelancer={{
        ...freelancer,
        freelancerCertifications: freelancer.freelancerCertifications.map(
          (certification) => ({
            ...certification,
            issueDate: certification.issueDate.toISOString(),
          }),
        ),
      }}
    />
  );
}
