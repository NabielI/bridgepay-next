import Link from "next/link";
import { CalendarDays, FolderKanban, Plus, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

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
  if (status === "held" || status === "released") {
    return "bg-teal-50 text-primary";
  }

  return "bg-amber-50 text-amber-700";
}

export default async function ClientProjectsPage() {
  const session = await requireDashboardSession("client");
  const projects = await prisma.project.findMany({
    where: { clientId: session.user.id },
    orderBy: { updatedAt: "desc" },
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
          status: true,
          amount: true,
          currency: true,
        },
      },
    },
  });

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-primary">
            Client Operations
          </p>
          <h1 className="text-3xl font-bold text-slate-950">Proyek Saya</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Semua proyek yang kamu post, lengkap dengan status escrow dan akses
            workspace.
          </p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Proyek Baru
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <FolderKanban className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          <h2 className="font-semibold text-slate-950">Belum ada proyek</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buat proyek baru agar freelancer bisa menemukannya di Discovery
            Feed.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-teal-300"
              data-testid="client-project-card"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <FolderKanban className="h-6 w-6 text-primary" />
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                  {project.status}
                </span>
              </div>
              <h2 className="font-bold text-slate-950">{project.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{project.category}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                {project.description}
              </p>
              <div
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${escrowBadgeClass(project.escrow?.status)}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Escrow {escrowLabel(project.escrow?.status)}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="font-semibold text-primary">
                  {project.currency} {project.budget.toLocaleString("en-US")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {project.deadline.toLocaleDateString("id-ID")}
                </span>
              </div>
              <Link
                href={`/workspace/${project.id}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Buka Workspace
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
