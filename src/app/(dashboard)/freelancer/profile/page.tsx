import { BadgeCheck, BriefcaseBusiness } from "lucide-react";

import { KycPanel } from "@/components/dashboard/KycPanel";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";
import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

export default async function FreelancerProfilePage() {
  const session = await requireDashboardSession("freelancer");
  const [profile, gigs] = await Promise.all([
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
    prisma.gig.findMany({
      where: { freelancerId: session.user.id, status: "published" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        startingPrice: true,
        currency: true,
        skills: true,
      },
    }),
  ]);

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Profil & Portofolio
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Identitas freelancer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Profil, skill, rate, KYC, dan gig published tersimpan sebagai data
          portofolio BridgePay.
        </p>
      </div>

      <ProfileEditor
        profile={{
          ...profile,
          kycSubmissions: profile.kycSubmissions.map((submission) => ({
            ...submission,
            reviewedAt: submission.reviewedAt?.toISOString() ?? null,
            createdAt: submission.createdAt.toISOString(),
          })),
        }}
      />
      <KycPanel
        initialStatus={profile.kycStatus}
        initialSubmissions={profile.kycSubmissions.map((submission) => ({
          ...submission,
          reviewedAt: submission.reviewedAt?.toISOString() ?? null,
          createdAt: submission.createdAt.toISOString(),
        }))}
      />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">Portofolio Gig</h2>
          <p className="mt-1 text-sm text-slate-500">
            Listing published dari Gig Builder tampil di Discovery Feed client.
          </p>
        </div>
        {gigs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada gig published.
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {gigs.map((gig) => (
              <article key={gig.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <BriefcaseBusiness className="h-5 w-5 text-primary" />
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Published
                  </span>
                </div>
                <h3 className="font-bold text-slate-950">{gig.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{gig.category}</p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  From {gig.currency} {gig.startingPrice.toLocaleString("en-US")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gig.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
