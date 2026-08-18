import { GigBuilder, type PublishedGig } from "@/components/dashboard/GigBuilder";
import type { GeneratedGigPackage } from "@/lib/gig-generator";
import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

export default async function FreelancerGigBuilderPage() {
  const session = await requireDashboardSession("freelancer");
  const gigs = await prisma.gig.findMany({
    where: { freelancerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
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
  });
  const serializedGigs = gigs.map((gig) => ({
    ...gig,
    packages: gig.packages as unknown as GeneratedGigPackage[],
    createdAt: gig.createdAt.toISOString(),
    updatedAt: gig.updatedAt.toISOString(),
  })) satisfies PublishedGig[];

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Freelancer Growth
        </p>
        <h1 className="text-3xl font-bold text-slate-950">Gig Builder AI</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Generator rule-based BridgePay membuat draft title, package, FAQ, dan
          deliverable dari brief singkat tanpa memakai API AI berbayar.
        </p>
      </div>
      <GigBuilder initialGigs={serializedGigs} />
    </section>
  );
}
