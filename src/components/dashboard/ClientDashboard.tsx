"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  DollarSign,
  FileCheck2,
  FolderKanban,
  Loader2,
  Plus,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { KycPanel } from "@/components/dashboard/KycPanel";
import { ProfileData, ProfileEditor } from "@/components/dashboard/ProfileEditor";

export interface ClientProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  deadline: string;
  status: string;
  createdAt: string;
  escrow: {
    id: string;
    amount: number;
    currency: string;
    status: "pending" | "held" | "released";
    paymentMethod: string;
  } | null;
  applications: {
    id: string;
    status: "pending" | "accepted" | "rejected" | "withdrawn";
    createdAt: string;
    freelancer: {
      name: string | null;
      email: string;
      kycStatus: "pending" | "verified" | "rejected";
    };
  }[];
  client?: {
    name: string | null;
    email: string;
    company: string | null;
  };
}

interface ClientDashboardProps {
  email?: string | null;
  profile: ProfileData;
  projects: ClientProject[];
}

const categories = [
  "Web Development",
  "UI/UX Design",
  "Graphic Design",
  "Digital Marketing",
  "Mobile Development",
  "Content Writing",
  "Data Analysis",
];

const stepLabels = ["Info", "Budget", "Review"];

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

export function ClientDashboard({
  email,
  profile,
  projects: initialProjects,
}: ClientDashboardProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: categories[0],
    budget: "",
    deadline: "",
  });
  const activeProjects = projects.filter((item) =>
    ["open", "active"].includes(item.status),
  ).length;
  const totalBudget = projects.reduce((sum, item) => sum + item.budget, 0);
  const heldEscrow = projects.filter((item) => item.escrow?.status === "held")
    .length;
  const pendingApplications = projects.flatMap((project) =>
    project.applications.map((application) => ({
      ...application,
      projectId: project.id,
      projectTitle: project.title,
    })),
  );
  const projectsNeedFunding = projects.filter(
    (project) => project.escrow?.status === "pending",
  );
  const releaseReadyProjects = projects.filter(
    (project) => project.escrow?.status === "held",
  );

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function canContinue() {
    if (step === 0) {
      return form.title.trim().length >= 3 && form.description.trim().length >= 10;
    }

    if (step === 1) {
      return Number(form.budget) > 0 && Boolean(form.deadline);
    }

    return true;
  }

  function nextStep() {
    if (!canContinue()) {
      setMessage("Lengkapi field wajib sebelum lanjut.");
      return;
    }

    setMessage(null);
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  }

  function resetForm() {
    setFormOpen(false);
    setStep(0);
    setMessage(null);
    setForm({
      title: "",
      description: "",
      category: categories[0],
      budget: "",
      deadline: "",
    });
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinue()) {
      setMessage("Lengkapi data proyek terlebih dahulu.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        budget: Number(form.budget),
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      project?: ClientProject;
      message?: string;
    } | null;

    setPending(false);

    if (!response.ok || !payload?.project) {
      setMessage(payload?.message ?? "Proyek gagal disimpan.");
      return;
    }

    setProjects((current) => [payload.project!, ...current]);
    resetForm();
  }

  return (
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-primary">
              BridgePay Dashboard
            </p>
            <h1 className="text-2xl font-bold text-slate-950">
              Dashboard Client
            </h1>
            <p className="mt-1 text-sm text-slate-500">Masuk sebagai {email}</p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Perlu Tindakan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review pelamar, funding escrow, dan release milestone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                data-testid="open-project-form-top"
              >
                <Plus className="h-4 w-4" />
                Proyek Baru
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <Link
                href="/client/projects"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm transition hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold text-slate-950">
                    {pendingApplications.length} pelamar pending review
                  </div>
                  <div className="mt-1 text-slate-500">
                    {pendingApplications[0]
                      ? `${pendingApplications[0].freelancer.name ?? pendingApplications[0].freelancer.email} menunggu di ${pendingApplications[0].projectTitle}`
                      : "Belum ada pelamar yang menunggu keputusan."}
                  </div>
                </div>
                <FileCheck2 className="h-5 w-5 text-primary" />
              </Link>
              <Link
                href={
                  projectsNeedFunding[0]
                    ? `/workspace/${projectsNeedFunding[0].id}`
                    : "/client/projects"
                }
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm transition hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold text-slate-950">
                    {projectsNeedFunding.length} escrow menunggu funding
                  </div>
                  <div className="mt-1 text-slate-500">
                    Fund escrow untuk mengunci kurs dan mulai proteksi milestone.
                  </div>
                </div>
                <WalletCards className="h-5 w-5 text-primary" />
              </Link>
              <Link
                href={
                  releaseReadyProjects[0]
                    ? `/workspace/${releaseReadyProjects[0].id}`
                    : "/client/projects"
                }
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm transition hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold text-slate-950">
                    {releaseReadyProjects.length} milestone siap direview
                  </div>
                  <div className="mt-1 text-slate-500">
                    Release tetap memeriksa KYC freelancer sebelum payout.
                  </div>
                </div>
                <ShieldCheck className="h-5 w-5 text-primary" />
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold text-slate-950">Snapshot Spend</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total Budget</div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  ${totalBudget.toLocaleString("en-US")}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Escrow Held</div>
                <div className="mt-1 text-2xl font-bold text-slate-950">
                  {heldEscrow} project
                </div>
              </div>
            </div>
          </article>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Project Aktif",
              value: activeProjects,
              icon: FolderKanban,
              bars: [36, 54, 68, 52, 84],
            },
            {
              label: "Total Budget",
              value: `$${totalBudget.toLocaleString("en-US")}`,
              icon: DollarSign,
              bars: [42, 58, 76, 64, 88],
            },
            {
              label: "Pending Review",
              value: pendingApplications.length,
              icon: FileCheck2,
              bars: [24, 36, 52, 72, 80],
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

        <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Project Client</h2>
              <p className="mt-1 text-sm text-slate-500">
                Project disimpan ke tabel Project Supabase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              data-testid="open-project-form"
            >
              <Plus className="h-4 w-4" />
              Proyek Baru
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-10 text-center">
              <FolderKanban className="mx-auto mb-3 h-9 w-9 text-slate-400" />
              <h3 className="font-semibold text-slate-950">Belum ada proyek</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Klik tombol Proyek Baru untuk membuat project pertama dari form
                multi-step.
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
                      <h3 className="font-bold text-slate-950">{project.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {project.category}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                      {project.status}
                    </span>
                  </div>
                  <div
                    className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${escrowBadgeClass(project.escrow?.status)}`}
                    data-testid="project-escrow-badge"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Escrow {escrowLabel(project.escrow?.status)}
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="font-semibold text-primary">
                      {project.currency} {project.budget.toLocaleString("en-US")}
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

        {formOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <form
              onSubmit={submitProject}
              className="w-full max-w-2xl rounded-2xl bg-white shadow-glass"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Buat Proyek Baru
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Step {step + 1} dari {stepLabels.length}: {stepLabels[step]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>

              <div className="p-5">
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {stepLabels.map((label, index) => (
                    <div
                      key={label}
                      className={`h-1 rounded-full ${
                        index <= step ? "bg-primary" : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                {message ? (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {message}
                  </div>
                ) : null}

                {step === 0 ? (
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Judul Proyek
                      </span>
                      <input
                        value={form.title}
                        onChange={(event) => updateForm("title", event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                        placeholder="Website company profile ekspor"
                        data-testid="project-title"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Deskripsi
                      </span>
                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          updateForm("description", event.target.value)
                        }
                        rows={5}
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                        placeholder="Jelaskan scope, deliverable, dan kebutuhan utama..."
                        data-testid="project-description"
                      />
                    </label>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Kategori Skill
                      </span>
                      <select
                        value={form.category}
                        onChange={(event) =>
                          updateForm("category", event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                        data-testid="project-category"
                      >
                        {categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Budget USD
                      </span>
                      <input
                        value={form.budget}
                        onChange={(event) => updateForm("budget", event.target.value)}
                        type="number"
                        min="1"
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                        placeholder="5000"
                        data-testid="project-budget"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">
                        Deadline
                      </span>
                      <input
                        value={form.deadline}
                        onChange={(event) =>
                          updateForm("deadline", event.target.value)
                        }
                        type="date"
                        className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                        data-testid="project-deadline"
                      />
                    </label>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-bold text-slate-950">{form.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {form.description}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div>Kategori: {form.category}</div>
                      <div>Budget: USD {Number(form.budget || 0).toLocaleString("en-US")}</div>
                      <div>Deadline: {form.deadline}</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 p-5">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(current - 1, 0))}
                  disabled={step === 0 || pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
                {step < stepLabels.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                    data-testid="project-next"
                  >
                    Lanjut
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="project-submit"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Simpan Proyek
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : null}

        <ProfileEditor profile={profile} />

        <KycPanel
          initialStatus={profile.kycStatus}
          initialSubmissions={profile.kycSubmissions}
        />
      </section>
  );
}
