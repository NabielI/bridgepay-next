"use client";

import { Loader2, Save } from "lucide-react";
import { FormEvent, useState } from "react";

import type { KycSubmissionData } from "@/components/dashboard/KycPanel";

export interface ProfileData {
  name: string | null;
  email: string;
  phone: string | null;
  role: "freelancer" | "client";
  kycStatus: "pending" | "verified" | "rejected";
  kycSubmissions: KycSubmissionData[];
  skills: string[];
  rate: string | null;
  company: string | null;
  budget: string | null;
}

interface ProfileEditorProps {
  profile: ProfileData;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    skills: profile.skills.join(", "),
    rate: profile.rate ?? "",
    company: profile.company ?? "",
    budget: profile.budget ?? "",
  });
  const isClient = profile.role === "client";

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    setPending(false);
    setMessage(response.ok ? "Profil berhasil disimpan ke database." : payload?.message ?? "Profil gagal disimpan.");
  }

  return (
    <form
      onSubmit={submitProfile}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
    >
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">Edit Profil</h2>
        <p className="mt-1 text-sm text-slate-500">
          Form ini menyimpan perubahan ke tabel User Supabase.
        </p>
      </div>
      {message ? (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Nama
          </span>
          <input
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
            data-testid="profile-name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            No. Telepon
          </span>
          <input
            value={form.phone}
            onChange={(event) => updateForm("phone", event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
            data-testid="profile-phone"
          />
        </label>
        {isClient ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Perusahaan
              </span>
              <input
                value={form.company}
                onChange={(event) => updateForm("company", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="profile-company"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Budget Range
              </span>
              <input
                value={form.budget}
                onChange={(event) => updateForm("budget", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="profile-budget"
              />
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Skills
              </span>
              <input
                value={form.skills}
                onChange={(event) => updateForm("skills", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="profile-skills"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Rate
              </span>
              <input
                value={form.rate}
                onChange={(event) => updateForm("rate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                data-testid="profile-rate"
              />
            </label>
          </>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="profile-submit"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan Profil
      </button>
    </form>
  );
}
