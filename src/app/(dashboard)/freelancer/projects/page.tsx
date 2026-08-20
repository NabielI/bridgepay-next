import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  FolderKanban,
  ShieldCheck,
  XCircle,
} from "lucide-react";

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

function applicationStatusClass(status: string) {
  if (status === "accepted") {
    return "bg-teal-50 text-primary";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function applicationStatusIcon(status: string) {
  if (status === "accepted") {
    return BadgeCheck;
  }

  if (status === "rejected" || status === "withdrawn") {
    return XCircle;
  }

  return Clock;
}

export default async function FreelancerProjectsPage() {
  const session = await requireDashboardSession("freelancer");
  const applications = await prisma.projectApplication.findMany({
    where: { freelancerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      id: true,
      status: true,
      coverLetter: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          budget: true,
          currency: true,
          deadline: true,
          status: true,
          assignedFreelancerId: true,
          escrow: {
            select: {
              status: true,
              amount: true,
              currency: true,
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
      },
    },
  });

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Freelancer Workspace
        </p>
        <h1 className="text-3xl font-bold text-slate-950">Proyek Saya</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Daftar lamaran yang kamu kirim. Workspace baru terbuka setelah client
          menerima lamaranmu.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <FolderKanban className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          <h2 className="font-semibold text-slate-950">Belum ada lamaran</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buka Discovery Feed lalu klik Ajukan Diri pada project open.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {applications.map((application) => {
            const project = application.project;
            const StatusIcon = applicationStatusIcon(application.status);
            const canOpenWorkspace =
              application.status === "accepted" &&
              project.assignedFreelancerId === session.user.id;

            return (
              <article
                key={application.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-teal-300"
                data-testid="freelancer-project-card"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <FolderKanban className="h-6 w-6 text-primary" />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${applicationStatusClass(application.status)}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {application.status}
                  </span>
                </div>
                <h2 className="font-bold text-slate-950">{project.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {project.client.company ??
                    project.client.name ??
                    project.client.email}
                </p>
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
                {canOpenWorkspace ? (
                  <Link
                    href={`/workspace/${project.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                  >
                    Buka Workspace
                  </Link>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-500">
                    {application.status === "rejected"
                      ? "Lamaran tidak diterima"
                      : "Menunggu keputusan client"}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
