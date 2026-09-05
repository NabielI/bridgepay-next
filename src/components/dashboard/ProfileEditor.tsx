"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import type { KycSubmissionData } from "@/components/dashboard/KycPanel";

export interface FreelancerExperienceData {
  id?: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface FreelancerPortfolioProjectData {
  id?: string;
  title: string;
  description: string;
  link: string | null;
  imageUrl: string | null;
}

export interface FreelancerLanguageData {
  id?: string;
  language: string;
  level: string;
}

export interface FreelancerCertificationData {
  id?: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string | null;
}

export interface ProfileData {
  name: string | null;
  email: string;
  phone: string | null;
  role: "freelancer" | "client" | "admin";
  kycStatus: "pending" | "verified" | "rejected";
  kycSubmissions: KycSubmissionData[];
  skills: string[];
  rate: string | null;
  company: string | null;
  budget: string | null;
  bio?: string | null;
  experiences?: FreelancerExperienceData[];
  portfolioProjects?: FreelancerPortfolioProjectData[];
  languages?: FreelancerLanguageData[];
  certifications?: FreelancerCertificationData[];
}

interface ProfileEditorProps {
  profile: ProfileData;
}

const emptyExperience = (): FreelancerExperienceData => ({
  company: "",
  position: "",
  period: "",
  description: "",
});

const emptyPortfolioProject = (): FreelancerPortfolioProjectData => ({
  title: "",
  description: "",
  link: "",
  imageUrl: "",
});

const emptyLanguage = (): FreelancerLanguageData => ({
  language: "",
  level: "",
});

const emptyCertification = (): FreelancerCertificationData => ({
  name: "",
  issuer: "",
  issueDate: "",
  credentialUrl: "",
});

function dateForInput(value: string) {
  return value ? value.slice(0, 10) : "";
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
    bio: profile.bio ?? "",
  });
  const [experiences, setExperiences] = useState<FreelancerExperienceData[]>(
    profile.experiences?.length ? profile.experiences : [emptyExperience()],
  );
  const [portfolioProjects, setPortfolioProjects] = useState<
    FreelancerPortfolioProjectData[]
  >(
    profile.portfolioProjects?.length
      ? profile.portfolioProjects
      : [emptyPortfolioProject()],
  );
  const [languages, setLanguages] = useState<FreelancerLanguageData[]>(
    profile.languages?.length ? profile.languages : [emptyLanguage()],
  );
  const [certifications, setCertifications] = useState<
    FreelancerCertificationData[]
  >(
    profile.certifications?.length
      ? profile.certifications.map((certification) => ({
          ...certification,
          issueDate: dateForInput(certification.issueDate),
        }))
      : [emptyCertification()],
  );
  const isClient = profile.role === "client";
  const isFreelancer = profile.role === "freelancer";

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateExperience(
    index: number,
    key: keyof FreelancerExperienceData,
    value: string,
  ) {
    setExperiences((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function updatePortfolioProject(
    index: number,
    key: keyof FreelancerPortfolioProjectData,
    value: string,
  ) {
    setPortfolioProjects((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function updateLanguage(
    index: number,
    key: keyof FreelancerLanguageData,
    value: string,
  ) {
    setLanguages((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function updateCertification(
    index: number,
    key: keyof FreelancerCertificationData,
    value: string,
  ) {
    setCertifications((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        experiences,
        portfolioProjects,
        languages,
        certifications,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    setPending(false);
    setMessage(
      response.ok
        ? "Profil berhasil disimpan ke database."
        : payload?.message ?? "Profil gagal disimpan.",
    );
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
                placeholder="React, UI Design, API Integration"
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
                placeholder="USD 35/hour"
              />
            </label>
          </>
        )}
      </div>

      {isFreelancer ? (
        <div className="mt-6 grid gap-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Ringkasan / Bio Singkat
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => updateForm("bio", event.target.value)}
              className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
              data-testid="profile-bio"
              placeholder="Ceritakan spesialisasi, pengalaman utama, dan jenis project yang paling cocok."
            />
          </label>

          <section className="rounded-2xl border border-slate-200 p-4">
            <CvSectionHeader
              title="Pengalaman Kerja"
              onAdd={() =>
                setExperiences((current) => [...current, emptyExperience()])
              }
            />
            <div className="mt-4 grid gap-4">
              {experiences.map((experience, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex justify-end">
                    <RemoveButton
                      onClick={() =>
                        setExperiences((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={experience.company}
                      onChange={(event) =>
                        updateExperience(index, "company", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      data-testid="profile-experience-company"
                      placeholder="Perusahaan / klien"
                    />
                    <input
                      value={experience.position}
                      onChange={(event) =>
                        updateExperience(index, "position", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Posisi"
                    />
                    <input
                      value={experience.period}
                      onChange={(event) =>
                        updateExperience(index, "period", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="2022 - 2025"
                    />
                  </div>
                  <textarea
                    value={experience.description}
                    onChange={(event) =>
                      updateExperience(index, "description", event.target.value)
                    }
                    className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary"
                    placeholder="Deskripsi singkat kontribusi dan hasil kerja."
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <CvSectionHeader
              title="Portfolio Project"
              onAdd={() =>
                setPortfolioProjects((current) => [
                  ...current,
                  emptyPortfolioProject(),
                ])
              }
            />
            <div className="mt-4 grid gap-4">
              {portfolioProjects.map((portfolio, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex justify-end">
                    <RemoveButton
                      onClick={() =>
                        setPortfolioProjects((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={portfolio.title}
                      onChange={(event) =>
                        updatePortfolioProject(index, "title", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      data-testid="profile-portfolio-title"
                      placeholder="Judul project"
                    />
                    <input
                      value={portfolio.link ?? ""}
                      onChange={(event) =>
                        updatePortfolioProject(index, "link", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Link project"
                    />
                    <input
                      value={portfolio.imageUrl ?? ""}
                      onChange={(event) =>
                        updatePortfolioProject(
                          index,
                          "imageUrl",
                          event.target.value,
                        )
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary md:col-span-2"
                      placeholder="URL gambar / screenshot"
                    />
                  </div>
                  <textarea
                    value={portfolio.description}
                    onChange={(event) =>
                      updatePortfolioProject(
                        index,
                        "description",
                        event.target.value,
                      )
                    }
                    className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary"
                    placeholder="Deskripsi project dan dampaknya."
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <CvSectionHeader
              title="Kemampuan Bahasa"
              onAdd={() =>
                setLanguages((current) => [...current, emptyLanguage()])
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {languages.map((language, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={language.language}
                    onChange={(event) =>
                      updateLanguage(index, "language", event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    data-testid="profile-language-name"
                    placeholder="Indonesia"
                  />
                  <input
                    value={language.level}
                    onChange={(event) =>
                      updateLanguage(index, "level", event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="Native"
                  />
                  <RemoveButton
                    onClick={() =>
                      setLanguages((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <CvSectionHeader
              title="Sertifikasi"
              onAdd={() =>
                setCertifications((current) => [
                  ...current,
                  emptyCertification(),
                ])
              }
            />
            <div className="mt-4 grid gap-4">
              {certifications.map((certification, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex justify-end">
                    <RemoveButton
                      onClick={() =>
                        setCertifications((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={certification.name}
                      onChange={(event) =>
                        updateCertification(index, "name", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      data-testid="profile-certification-name"
                      placeholder="Nama sertifikasi"
                    />
                    <input
                      value={certification.issuer}
                      onChange={(event) =>
                        updateCertification(index, "issuer", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Penerbit"
                    />
                    <input
                      type="date"
                      value={certification.issueDate}
                      onChange={(event) =>
                        updateCertification(index, "issueDate", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      data-testid="profile-certification-date"
                    />
                    <input
                      value={certification.credentialUrl ?? ""}
                      onChange={(event) =>
                        updateCertification(
                          index,
                          "credentialUrl",
                          event.target.value,
                        )
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Link verifikasi"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="profile-submit"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Simpan Profil
      </button>
    </form>
  );
}

function CvSectionHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Tambah
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
      aria-label="Hapus item CV"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Hapus
    </button>
  );
}
