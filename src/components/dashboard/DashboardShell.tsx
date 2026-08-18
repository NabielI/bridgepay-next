import type { Session } from "next-auth";
import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { GigBuilder, type PublishedGig } from "@/components/dashboard/GigBuilder";
import { KycPanel } from "@/components/dashboard/KycPanel";
import { ProfileData, ProfileEditor } from "@/components/dashboard/ProfileEditor";

interface DashboardProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  deadline: string;
  status: string;
  escrow: {
    id: string;
    amount: number;
    currency: string;
    status: "pending" | "held" | "released";
    paymentMethod: string;
  } | null;
  client: {
    name: string | null;
    email: string;
    company: string | null;
  };
}

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

interface DashboardShellProps {
  role: "client" | "freelancer";
  session: Session;
  profile: ProfileData;
  projects?: DashboardProject[];
  gigs?: PublishedGig[];
}

export function DashboardShell({
  role,
  session,
  profile,
  projects = [],
  gigs = [],
}: DashboardShellProps) {
  const isClient = role === "client";
  const activeProjects = projects.filter((project) =>
    ["open", "active"].includes(project.status),
  ).length;
  const heldEscrow = projects.filter((project) => project.escrow?.status === "held")
    .length;
  const averageBudget =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + project.budget, 0) /
            projects.length,
        )
      : 0;

  return (
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-primary">
              BridgePay Dashboard
            </p>
            <h1
              className="text-2xl font-bold text-slate-950"
              data-testid="dashboard-heading"
            >
              {isClient ? "Dashboard Client" : "Dashboard Freelancer"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Masuk sebagai {session.user?.email}
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: isClient ? BriefcaseBusiness : UserRoundCheck,
              label: "Proyek Aktif",
              value: activeProjects,
              bars: [40, 72, 56, 86, 64],
            },
            {
              icon: ShieldCheck,
              label: "Escrow Held",
              value: heldEscrow,
              bars: [24, 44, 52, 68, 76],
            },
            {
              icon: ShieldCheck,
              label: "Avg Budget",
              value: `$${averageBudget.toLocaleString("en-US")}`,
              bars: [35, 54, 62, 48, 80],
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <item.icon className="mb-4 h-5 w-5 text-primary" />
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="mt-1 text-xl font-bold text-slate-950">
                    {item.value}
                  </div>
                </div>
                <div className="flex h-12 items-end gap-1">
                  {item.bars.map((bar, index) => (
                    <span
                      key={`${item.label}-${index}`}
                      className="w-1.5 rounded-full bg-teal-200"
                      style={{ height: `${bar}%` }}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <ProfileEditor profile={profile} />

        <KycPanel
          initialStatus={profile.kycStatus}
          initialSubmissions={profile.kycSubmissions}
        />

        {!isClient ? (
          <GigBuilder initialGigs={gigs} />
        ) : null}

        {!isClient ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Proyek Terbuka
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Data ditarik langsung dari tabel Project.
                </p>
              </div>
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Browse Feed
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="p-10 text-center">
                <BriefcaseBusiness className="mx-auto mb-3 h-9 w-9 text-slate-400" />
                <h3 className="font-semibold text-slate-950">
                  Belum ada proyek open
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Project baru dari client akan muncul di sini setelah disimpan
                  ke database.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 p-5 md:grid-cols-2">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-300"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-950">
                          {project.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {project.client.company ??
                            project.client.name ??
                            project.client.email}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <BadgeCheck className="h-3 w-3" />
                        {project.status}
                      </span>
                    </div>
                    <div
                      className={`mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${escrowBadgeClass(project.escrow?.status)}`}
                      data-testid="freelancer-escrow-badge"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Escrow {escrowLabel(project.escrow?.status)}
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                      {project.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="font-semibold text-primary">
                        {project.currency}{" "}
                        {project.budget.toLocaleString("en-US")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(project.deadline).toLocaleDateString("id-ID")}
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
        ) : null}
      </section>
  );
}
