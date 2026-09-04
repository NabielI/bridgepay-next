import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import {
  AdminKycReviewPanel,
  type AdminKycSubmission,
} from "@/components/admin/AdminKycReviewPanel";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

const adminKycSubmissionSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  status: true,
  reviewNote: true,
  reviewerRole: true,
  reviewedAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      kycStatus: true,
    },
  },
};

function serializeSubmission(
  submission: Omit<AdminKycSubmission, "createdAt" | "reviewedAt"> & {
    createdAt: Date;
    reviewedAt: Date | null;
  },
): AdminKycSubmission {
  return {
    ...submission,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
  };
}

export default async function AdminKycPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect(dashboardPathForRole(session.user.role));
  }

  const [pendingSubmissions, reviewedSubmissions] = await Promise.all([
    prisma.kycSubmission.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: adminKycSubmissionSelect,
    }),
    prisma.kycSubmission.findMany({
      where: { status: { in: ["verified", "rejected"] } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      select: adminKycSubmissionSelect,
    }),
  ]);

  return (
    <DashboardChrome
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
      }}
    >
      <section className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="mb-1 text-xs font-semibold uppercase text-primary">
            Admin Panel
          </p>
          <h1 className="text-3xl font-bold text-slate-950">
            KYC Review Queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Review dokumen KYC dari user BridgePay. Semua keputusan tercatat ke
            ActivityLog dengan actor admin.
          </p>
        </div>

        <AdminKycReviewPanel
          pendingSubmissions={pendingSubmissions.map(serializeSubmission)}
          reviewedSubmissions={reviewedSubmissions.map(serializeSubmission)}
        />
      </section>
    </DashboardChrome>
  );
}
