import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectApplyButton } from "@/components/projects/ProjectApplyButton";

function escrowLabel(status?: string) {
  if (status === "held") {
    return "Held";
  }

  if (status === "released") {
    return "Released";
  }

  return "Pending";
}

function escrowBadgeClass(status?: string) {
  if (status === "held") {
    return "bg-teal-50 text-primary";
  }

  if (status === "released") {
    return "bg-indigo-50 text-indigo-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default async function DiscoveryPage() {
  const session = await getServerSession(authOptions);
  const isFreelancer = session?.user?.role === "freelancer";
  const isClient = session?.user?.role === "client";
  const currentFreelancerId =
    isFreelancer && session?.user?.id ? session.user.id : "__not_freelancer__";
  const [freelancers, clients, projects, gigs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "freelancer" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        email: true,
        skills: true,
        rate: true,
        kycStatus: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "client" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        company: true,
        budget: true,
        kycStatus: true,
      },
    }),
    prisma.project.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 12,
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
        applications: {
          where: { freelancerId: currentFreelancerId },
          take: 1,
          select: {
            id: true,
            status: true,
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
      where: { status: "published" },
      orderBy: { updatedAt: "desc" },
      take: 9,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        skills: true,
        startingPrice: true,
        currency: true,
        deliverables: true,
        freelancer: {
          select: {
            name: true,
            email: true,
            kycStatus: true,
            rate: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-navy-950 px-6 py-12 text-white shadow-soft">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-semibold uppercase text-teal-300">
            Discovery Feed
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            {isFreelancer
              ? "Temukan proyek terbuka dari client BridgePay."
              : "Browse talenta dan sinyal demand dari database BridgePay."}
          </h1>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        {isFreelancer ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  Proyek Terbuka
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Freelancer browse project yang tersimpan di tabel Project.
                </p>
              </div>
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <Search className="h-4 w-4" />
                Buka Workspace
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <h3 className="font-semibold text-slate-950">
                  Belum ada project open
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Client perlu membuat proyek baru agar muncul di feed ini.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <BriefcaseBusiness className="h-6 w-6 text-primary" />
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                        {project.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-950">{project.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {project.client.company ??
                        project.client.name ??
                        project.client.email}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {project.description}
                    </p>
                    <div
                      className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${escrowBadgeClass(project.escrow?.status)}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Escrow {escrowLabel(project.escrow?.status)}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="font-semibold text-primary">
                        {project.currency}{" "}
                        {project.budget.toLocaleString("en-US")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {project.deadline.toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <ProjectApplyButton
                      projectId={project.id}
                      projectTitle={project.title}
                      projectStatus={project.status}
                      initialApplication={project.applications[0] ?? null}
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              {isClient ? "Talenta Terbaru" : "Talenta Terverifikasi"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Client browse talent dari tabel User Supabase.
            </p>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Search className="h-4 w-4" />
            Buka Workspace
          </Link>
        </div>

        {freelancers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <UserRoundCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h3 className="font-semibold text-slate-950">Belum ada freelancer</h3>
            <p className="mt-1 text-sm text-slate-500">
              Register sebagai freelancer untuk mengisi feed ini.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {freelancers.map((talent) => (
              <article
                key={talent.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-primary">
                    <UserRoundCheck className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <BadgeCheck className="h-3 w-3" />
                    {talent.kycStatus}
                  </span>
                </div>
                <h3 className="font-bold text-slate-950">
                  {talent.name ?? talent.email}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {talent.skills.length > 0
                    ? talent.skills.join(", ")
                    : "Skill belum dilengkapi"}
                </p>
                <p className="mt-4 text-sm font-semibold text-primary">
                  {talent.rate ?? "Rate belum diisi"}
                </p>
                <Link
                  href="/workspace"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hubungi di Workspace
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Gig & Portfolio Published
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Listing jasa dari Gig Builder AI yang sudah dipublish freelancer.
              </p>
            </div>
            <Link
              href={isClient ? "/client/dashboard" : "/register"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <BriefcaseBusiness className="h-4 w-4" />
              {isClient ? "Post Project" : "Daftar untuk Hire"}
            </Link>
          </div>
          {gigs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <h3 className="font-semibold text-slate-950">
                Belum ada gig published
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Freelancer bisa membuat listing jasa dari dashboard.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {gigs.map((gig) => (
                <article
                  key={gig.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass"
                  data-testid="discovery-gig-card"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <BriefcaseBusiness className="h-6 w-6 text-primary" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck className="h-3 w-3" />
                      {gig.freelancer.kycStatus}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-950">{gig.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {gig.freelancer.name ?? gig.freelancer.email} - {gig.category}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {gig.description}
                  </p>
                  <div className="mt-4 text-sm font-semibold text-primary">
                    From {gig.currency}{" "}
                    {gig.startingPrice.toLocaleString("en-US")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {gig.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={isClient ? "/client/dashboard" : "/register"}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {isClient ? "Buat Project Serupa" : "Hire via BridgePay"}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {!isClient && !isFreelancer ? (
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-950">
              Proyek Terbuka
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 lg:col-span-3">
                  <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <h3 className="font-semibold text-slate-950">
                    Belum ada project open
                  </h3>
                </div>
              ) : (
                projects.slice(0, 3).map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
                  >
                    <BriefcaseBusiness className="mb-4 h-5 w-5 text-primary" />
                    <h3 className="font-bold text-slate-950">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {project.currency}{" "}
                      {project.budget.toLocaleString("en-US")} -{" "}
                      {project.category}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <h2 className="text-2xl font-bold text-slate-950">Client Aktif</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 lg:col-span-3">
                <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <h3 className="font-semibold text-slate-950">Belum ada client</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Register sebagai client untuk mengisi daftar ini.
                </p>
              </div>
            ) : (
              clients.map((client) => (
                <article
                  key={client.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
                >
                  <BriefcaseBusiness className="mb-4 h-5 w-5 text-primary" />
                  <h3 className="font-bold text-slate-950">
                    {client.company ?? client.name ?? "Client BridgePay"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Budget: {client.budget ?? "Belum diisi"}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
