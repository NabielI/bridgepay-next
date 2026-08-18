import { KycPanel } from "@/components/dashboard/KycPanel";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";
import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

export default async function ClientProfilePage() {
  const session = await requireDashboardSession("client");
  const profile = await prisma.user.findUniqueOrThrow({
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
  });
  const submissions = profile.kycSubmissions.map((submission) => ({
    ...submission,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
  }));

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Profil Client
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Identitas perusahaan
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Data PIC, perusahaan, budget range, dan KYC client tersimpan langsung
          ke database dan Supabase Storage.
        </p>
      </div>

      <ProfileEditor profile={{ ...profile, kycSubmissions: submissions }} />
      <KycPanel
        initialStatus={profile.kycStatus}
        initialSubmissions={submissions}
      />
    </section>
  );
}
