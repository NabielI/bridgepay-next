"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, FolderPlus, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import type { ClientProject } from "@/components/dashboard/ClientDashboard";

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

export function NewProjectForm() {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<ClientProject | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: categories[0],
    budget: "",
    deadline: "",
  });

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

    setCreatedProject(payload.project);
    setMessage("Proyek berhasil dibuat dan escrow pending otomatis tercatat.");
  }

  if (createdProject) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-primary">
          <FolderPlus className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-950">
          Proyek berhasil diposting
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {createdProject.title} sudah tersimpan di database dan siap muncul di
          Discovery Feed freelancer.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/workspace/${createdProject.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Buka Workspace
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/client/projects"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Lihat Proyek Saya
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={submitProject}
      className="rounded-2xl border border-slate-200 bg-white shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-primary">
            Client Workflow
          </p>
          <h2 className="text-xl font-bold text-slate-950">Buat Proyek Baru</h2>
          <p className="mt-1 text-sm text-slate-500">
            Step {step + 1} dari {stepLabels.length}: {stepLabels[step]}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Escrow Pending
        </span>
      </div>

      <div className="p-6">
        <div className="mb-6 grid grid-cols-3 gap-2">
          {stepLabels.map((label, index) => (
            <div key={label}>
              <div
                className={`h-1.5 rounded-full ${
                  index <= step ? "bg-primary" : "bg-slate-200"
                }`}
              />
              <div className="mt-2 text-xs font-semibold text-slate-500">
                {label}
              </div>
            </div>
          ))}
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                placeholder="Website company profile ekspor"
                data-testid="new-project-title"
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
                rows={6}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                placeholder="Jelaskan scope, deliverable, dan kebutuhan utama..."
                data-testid="new-project-description"
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
                onChange={(event) => updateForm("category", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="new-project-category"
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                placeholder="5000"
                data-testid="new-project-budget"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Deadline
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.deadline}
                  onChange={(event) => updateForm("deadline", event.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-10 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                  data-testid="new-project-deadline"
                />
              </div>
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-bold text-slate-950">{form.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {form.description}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <div>Kategori: {form.category}</div>
              <div>
                Budget: USD {Number(form.budget || 0).toLocaleString("en-US")}
              </div>
              <div>Deadline: {form.deadline}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 p-6">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          disabled={step === 0 || pending}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Kembali
        </button>
        {step < stepLabels.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            data-testid="new-project-next"
          >
            Lanjut
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="new-project-submit"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Proyek
          </button>
        )}
      </div>
    </form>
  );
}
