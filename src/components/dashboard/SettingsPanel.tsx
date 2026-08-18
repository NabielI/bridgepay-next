"use client";

import Link from "next/link";
import { Bell, LockKeyhole, Save } from "lucide-react";
import { useState } from "react";

interface SettingsPanelProps {
  role: "freelancer" | "client";
}

export function SettingsPanel({ role }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    projectUpdates: true,
    escrowAlerts: true,
    marketingDigest: false,
  });

  function toggle(key: keyof typeof settings) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Preferensi Notifikasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pengaturan prototype ini langsung berubah di UI untuk kebutuhan demo.
          </p>
        </div>
        <div className="grid gap-3 p-6">
          {[
            {
              key: "projectUpdates" as const,
              label: "Update proyek dan workspace",
              description: "Chat, file baru, dan perubahan milestone.",
            },
            {
              key: "escrowAlerts" as const,
              label: "Alert Smart Escrow",
              description: "Funded, held, released, dan payout milestone.",
            },
            {
              key: "marketingDigest" as const,
              label: "Digest marketplace",
              description: "Ringkasan peluang project dan talent mingguan.",
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-teal-300"
            >
              <span>
                <span className="block font-semibold text-slate-950">
                  {item.label}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {item.description}
                </span>
              </span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  settings[item.key] ? "bg-primary" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    settings[item.key] ? "left-6" : "left-1"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="grid gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <Bell className="mb-4 h-5 w-5 text-primary" />
          <h2 className="font-bold text-slate-950">Channel Aktif</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Email akun, in-app notification, dan update dashboard siap untuk
            dipakai sebagai kanal demo.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <LockKeyhole className="mb-4 h-5 w-5 text-primary" />
          <h2 className="font-bold text-slate-950">Keamanan Akun</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Login memakai NextAuth credentials dengan password bcrypt.
          </p>
          <Link
            href={role === "client" ? "/client/profile" : "/freelancer/profile"}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kelola Profil
          </Link>
        </article>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-primary">
          <Save className="mr-2 inline h-4 w-4" />
          Toggle tersimpan sebagai state demo selama sesi halaman aktif.
        </div>
      </aside>
    </section>
  );
}
