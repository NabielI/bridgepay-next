import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, ShieldCheck } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-background">
      <AppNav session={session} />
      <section className="bg-navy-950 px-5 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase text-teal-300">
              BridgePay
            </p>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-6xl">
              Satu dashboard untuk talenta, proyek, dan escrow global.
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-7 text-slate-300">
              Register menyimpan user ke Supabase dengan bcrypt. Login memakai
              NextAuth credentials dan redirect dashboard sesuai role di tabel
              User.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
              >
                Daftar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/discovery"
                className="rounded-lg border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Lihat Discovery
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Live Prototype</p>
                <h2 className="font-display text-2xl font-bold">
                  Auth + DB Ready
                </h2>
              </div>
              <BadgeCheck className="h-8 w-8 text-teal-300" />
            </div>
            <div className="grid gap-3">
              {[
                { icon: ShieldCheck, label: "Credentials auth", value: "bcrypt" },
                { icon: BriefcaseBusiness, label: "Role redirect", value: "DB role" },
                { icon: BadgeCheck, label: "Dashboard guard", value: "Proxy" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-white/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-teal-300" />
                    <span className="text-sm text-slate-200">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-semibold uppercase text-primary">
            Bagaimana Cara Kerja
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Client post proyek dan fund escrow.",
              "Freelancer kolaborasi di workspace dengan chat, file, dan milestone.",
              "Milestone disetujui, escrow released, payout tercatat di wallet.",
            ].map((item, index) => (
              <article
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 font-bold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="pricing" className="px-5 pb-16">
        <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-soft max-w-6xl">
          <p className="mb-2 text-sm font-semibold uppercase text-primary">
            Harga & Biaya
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-950">
            Fee transparan untuk setiap transaksi.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            BridgePay menerapkan model marketplace fee, escrow milestone, dan
            payout lokal dengan perhitungan biaya yang jelas sejak awal.
          </p>
        </div>
      </section>
    </main>
  );
}
