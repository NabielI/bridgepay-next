"use client";

import { BadgeCheck, Bot, Loader2, PackageCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import type { GeneratedGigDraft, GeneratedGigPackage } from "@/lib/gig-generator";

export interface PublishedGig {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  startingPrice: number;
  currency: string;
  packages: GeneratedGigPackage[];
  deliverables: string[];
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface GigDraftResponse {
  id: string;
  generated: GeneratedGigDraft;
  generationMode: "template" | "ai";
}

interface GigBuilderProps {
  initialGigs: PublishedGig[];
}

const categories = [
  "Web Development",
  "UI/UX Design",
  "Brand Identity",
  "Digital Marketing",
  "Data Analysis",
  "Content Writing",
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "premium", label: "Premium" },
  { value: "fast", label: "Fast Turnaround" },
];

function packageSummary(packages: GeneratedGigPackage[]) {
  return packages
    .map((item) => `${item.name}: ${item.price}`)
    .join(" / ");
}

export function GigBuilder({ initialGigs }: GigBuilderProps) {
  const [gigs, setGigs] = useState(initialGigs);
  const [draft, setDraft] = useState<GigDraftResponse | null>(null);
  const [pending, setPending] = useState<"generate" | "publish" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    brief: "Saya bisa membuat landing page modern untuk UMKM ekspor yang butuh profil bisnis bilingual, responsive, dan siap dipakai untuk campaign.",
    category: categories[0],
    skills: "Next.js, React, Tailwind CSS",
    targetClient: "UMKM ekspor Indonesia",
    tone: "professional",
    startingPrice: "350",
  });
  const [editable, setEditable] = useState({
    title: "",
    description: "",
  });

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("generate");
    setMessage(null);

    const response = await fetch("/api/gigs/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startingPrice: Number(form.startingPrice),
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      draft?: GigDraftResponse;
      message?: string;
    } | null;

    setPending(null);

    if (!response.ok || !payload?.draft) {
      setMessage(payload?.message ?? "Gig draft gagal dibuat.");
      return;
    }

    setDraft(payload.draft);
    setEditable({
      title: payload.draft.generated.title,
      description: payload.draft.generated.description,
    });
    setMessage("Draft gig berhasil dibuat dengan generator template BridgePay.");
  }

  async function publishGig() {
    if (!draft) {
      return;
    }

    setPending("publish");
    setMessage(null);

    const generated = draft.generated;
    const response = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: draft.id,
        title: editable.title,
        description: editable.description,
        category: generated.category,
        skills: generated.skills,
        startingPrice: generated.startingPrice,
        currency: generated.currency,
        packages: generated.packages,
        deliverables: generated.deliverables,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      gig?: PublishedGig;
      message?: string;
    } | null;

    setPending(null);

    if (!response.ok || !payload?.gig) {
      setMessage(payload?.message ?? "Gig gagal dipublish.");
      return;
    }

    setGigs((current) => [payload.gig!, ...current]);
    setMessage("Gig berhasil dipublish dan sekarang bisa muncul di Discovery Feed.");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-soft" id="gig-builder">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Gig Builder AI</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mode prototype ini memakai generator rule-based, tanpa API AI
              berbayar.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
            <Bot className="h-3.5 w-3.5" />
            Template AI
          </span>
        </div>
        {message ? (
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            {message}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={generateDraft} className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Deskripsi Singkat
            </span>
            <textarea
              value={form.brief}
              onChange={(event) => updateForm("brief", event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
              data-testid="gig-brief"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Kategori
              </span>
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="gig-category"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Tone
              </span>
              <select
                value={form.tone}
                onChange={(event) => updateForm("tone", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="gig-tone"
              >
                {tones.map((tone) => (
                  <option key={tone.value} value={tone.value}>
                    {tone.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Skill utama
            </span>
            <input
              value={form.skills}
              onChange={(event) => updateForm("skills", event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
              data-testid="gig-skills"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Target client
              </span>
              <input
                value={form.targetClient}
                onChange={(event) =>
                  updateForm("targetClient", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="gig-target-client"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Starting price USD
              </span>
              <input
                value={form.startingPrice}
                onChange={(event) =>
                  updateForm("startingPrice", event.target.value)
                }
                type="number"
                min="50"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="gig-starting-price"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={Boolean(pending)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="gig-generate"
          >
            {pending === "generate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Draft
          </button>
        </form>

        <div className="grid gap-4">
          {draft ? (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                  {draft.generationMode}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {draft.generated.serviceAngle}
                </span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </span>
                <input
                  value={editable.title}
                  onChange={(event) =>
                    setEditable((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                  data-testid="gig-generated-title"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  value={editable.description}
                  onChange={(event) =>
                    setEditable((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                  data-testid="gig-generated-description"
                />
              </label>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {draft.generated.packages.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-bold text-slate-950">
                      {item.name}
                    </div>
                    <div className="mt-1 text-lg font-bold text-primary">
                      {draft.generated.currency} {item.price.toLocaleString("en-US")}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.timeline}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-950">
                  Deliverables
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.generated.deliverables.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={publishGig}
                disabled={Boolean(pending)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="gig-publish"
              >
                {pending === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                Publish Gig
              </button>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <h3 className="font-semibold text-slate-950">
                Draft akan muncul di sini
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Generator akan membuat title, package, deliverables, process,
                dan FAQ dari input di sebelah kiri.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-950">Published Gigs</h3>
        {gigs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Belum ada gig published. Buat draft dan publish untuk tampil di
            Discovery Feed.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {gigs.map((gig) => (
              <article
                key={gig.id}
                className="rounded-2xl border border-slate-200 p-4"
                data-testid="published-gig-card"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-950">{gig.title}</h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                    <BadgeCheck className="h-3 w-3" />
                    {gig.status}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                  {gig.description}
                </p>
                <div className="mt-3 text-sm font-semibold text-primary">
                  From {gig.currency} {gig.startingPrice.toLocaleString("en-US")}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {packageSummary(gig.packages)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
