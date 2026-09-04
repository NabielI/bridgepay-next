import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Globe2,
  Quote,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ShowcaseGig {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  startingPrice: number;
  currency: string;
  freelancer: {
    name: string | null;
    email: string;
    kycStatus: string;
    rate: string | null;
  };
}

const fallbackShowcase: ShowcaseGig[] = [
  {
    id: "demo-landing-page",
    title: "Bilingual landing page untuk UMKM ekspor",
    description:
      "Website responsive, copy Indonesia-Inggris, dan struktur campaign-ready untuk validasi pasar global.",
    category: "Web Development",
    skills: ["Next.js", "Tailwind", "Copywriting"],
    startingPrice: 350,
    currency: "USD",
    freelancer: {
      name: "Contoh Freelancer",
      email: "demo-freelancer@bridgepay.local",
      kycStatus: "pending",
      rate: "Demo profile",
    },
  },
  {
    id: "demo-brand-kit",
    title: "Brand kit premium untuk export-ready business",
    description:
      "Logo refinement, pitch deck visual, dan guideline warna untuk client B2B lintas negara.",
    category: "Brand Identity",
    skills: ["Branding", "Pitch Deck", "Figma"],
    startingPrice: 500,
    currency: "USD",
    freelancer: {
      name: "Contoh Designer",
      email: "demo-designer@bridgepay.local",
      kycStatus: "pending",
      rate: "Demo profile",
    },
  },
  {
    id: "demo-dashboard",
    title: "Dashboard operasional untuk monitoring project",
    description:
      "Dashboard ringkas untuk track milestone, file handoff, dan status escrow lintas stakeholder.",
    category: "Data Analysis",
    skills: ["Dashboard", "Analytics", "UX"],
    startingPrice: 420,
    currency: "USD",
    freelancer: {
      name: "Contoh Analyst",
      email: "demo-analyst@bridgepay.local",
      kycStatus: "pending",
      rate: "Demo profile",
    },
  },
];

const testimonials = [
  {
    name: "Raka, freelance web developer",
    quote:
      "Saya join BridgePay karena diskusi project, escrow, dan file delivery ada di satu tempat. Untuk freelancer, kepastian milestone itu penting.",
  },
  {
    name: "Maya, brand designer",
    quote:
      "Client global biasanya minta bukti trust. Status KYC, portfolio, dan riwayat escrow membantu saya terlihat lebih siap.",
  },
  {
    name: "Dian, data analyst",
    quote:
      "Workflow-nya terasa dibuat untuk kerja lintas negara, bukan cuma listing job. Saya bisa paham status payout dari awal.",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function freelancerKey(gig: ShowcaseGig) {
  return (gig.freelancer.email || gig.freelancer.name || gig.id).toLowerCase();
}

function selectShowcase(gigs: ShowcaseGig[]) {
  if (gigs.length <= 2) {
    return gigs;
  }

  const uniqueFreelancers = new Map<string, ShowcaseGig>();

  for (const gig of gigs) {
    const key = freelancerKey(gig);

    if (!uniqueFreelancers.has(key)) {
      uniqueFreelancers.set(key, gig);
    }
  }

  if (uniqueFreelancers.size <= 1) {
    return gigs.slice(0, 2);
  }

  const selected = Array.from(uniqueFreelancers.values());
  const selectedIds = new Set(selected.map((gig) => gig.id));

  for (const gig of gigs) {
    if (selected.length >= 6) {
      break;
    }

    if (!selectedIds.has(gig.id)) {
      selected.push(gig);
      selectedIds.add(gig.id);
    }
  }

  return selected;
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const [gigs, verifiedFreelancers, completedProjects, protectedEscrows] =
    await Promise.all([
      prisma.gig.findMany({
        where: { status: "published" },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          skills: true,
          startingPrice: true,
          currency: true,
          freelancer: {
            select: {
              name: true,
              email: true,
              kycStatus: true,
              rate: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: { role: "freelancer", kycStatus: "verified" },
      }),
      prisma.project.count({
        where: { status: "completed" },
      }),
      prisma.escrow.count({
        where: { status: { in: ["held", "released"] } },
      }),
    ]);
  const showcase = selectShowcase(gigs.length > 0 ? gigs : fallbackShowcase);
  const hasLimitedLiveShowcase = gigs.length > showcase.length;
  const heroPreview = showcase.slice(0, showcase.length <= 2 ? 2 : 3);
  const trustSignals = [
    {
      label: "Freelancer terverifikasi",
      value:
        verifiedFreelancers > 0
          ? verifiedFreelancers.toLocaleString("id-ID")
          : "50+",
      note: verifiedFreelancers > 0 ? "Data database" : "Target prototype",
    },
    {
      label: "Project selesai",
      value:
        completedProjects > 0 ? completedProjects.toLocaleString("id-ID") : "25+",
      note: completedProjects > 0 ? "Data database" : "Target prototype",
    },
    {
      label: "Escrow terlindungi",
      value:
        protectedEscrows > 0 ? protectedEscrows.toLocaleString("id-ID") : "100%",
      note: protectedEscrows > 0 ? "Data database" : "Target prototype",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <AppNav session={session} />
      <section className="overflow-hidden bg-navy-950 px-5 py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase text-teal-300">
              BridgePay
            </p>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-6xl">
              Marketplace talenta global dengan escrow yang jelas sejak deal.
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-7 text-slate-300">
              Client bisa melihat gig freelancer sebelum login, freelancer bisa
              membangun portfolio jasa, dan setiap milestone punya jejak escrow
              yang transparan.
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
                href="#freelancer-showcase"
                className="rounded-lg border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Lihat Portfolio
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Talent Preview</p>
                <h2 className="font-display text-2xl font-bold">
                  Gig aktif sebelum login
                </h2>
              </div>
              <Sparkles className="h-8 w-8 text-teal-300" />
            </div>
            <div className="grid gap-3">
              {heroPreview.map((gig) => (
                <div
                  key={gig.id}
                  className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-white/10 p-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-300 text-sm font-bold text-navy-950">
                      {initials(gig.freelancer.name ?? gig.freelancer.email)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-white">
                        {gig.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-300">
                        {gig.freelancer.name ?? gig.freelancer.email}
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
                    {gig.currency} {gig.startingPrice.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
              {hasLimitedLiveShowcase ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
                  Menampilkan gig pilihan supaya preview tetap ringkas.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <section className="border-b border-slate-200 bg-white px-5 py-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {trustSignals.map((item) => (
            <article key={item.label} className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-primary">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-950">
                  {item.value}
                </div>
                <div className="text-sm text-slate-600">{item.label}</div>
                <div className="text-xs font-semibold text-slate-400">
                  {item.note}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="freelancer-showcase" className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase text-primary">
                Portfolio Freelancer
              </p>
              <h2 className="text-3xl font-bold text-slate-950">
                Gig published yang bisa dilihat sebelum login.
              </h2>
            </div>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Buka Discovery
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div
            className={
              showcase.length <= 2
                ? "grid gap-4 md:grid-cols-2"
                : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            }
          >
            {showcase.map((gig) => (
              <article
                key={gig.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-950 text-sm font-bold text-white">
                      {initials(gig.freelancer.name ?? gig.freelancer.email)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">
                        {gig.freelancer.name ?? gig.freelancer.email}
                      </div>
                      <div className="text-xs text-slate-500">
                        KYC {gig.freelancer.kycStatus}
                      </div>
                    </div>
                  </div>
                  <span className="max-w-32 shrink-0 truncate rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
                    {gig.category}
                  </span>
                </div>
                <h3 className="line-clamp-2 break-words font-bold leading-6 text-slate-950">
                  {gig.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {gig.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {gig.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">Mulai dari</span>
                  <span className="text-lg font-bold text-primary">
                    {gig.currency} {gig.startingPrice.toLocaleString("en-US")}
                  </span>
                </div>
              </article>
            ))}
          </div>
          {gigs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Showcase di atas adalah contoh dummy untuk prototype sampai ada gig
              published di database.
            </p>
          ) : null}
          {hasLimitedLiveShowcase ? (
            <p className="mt-4 text-sm text-slate-500">
              Beberapa gig dari freelancer yang sama disembunyikan agar preview
              sebelum login tetap rapi dan tidak repetitif.
            </p>
          ) : null}
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
      <section className="bg-white px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold uppercase text-primary">
              Testimoni Freelancer
            </p>
            <h2 className="text-3xl font-bold text-slate-950">
              Alasan freelancer join BridgePay.
            </h2>
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Contoh dummy untuk prototype, belum testimoni produksi.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <Quote className="mb-4 h-5 w-5 text-primary" />
                <p className="text-sm leading-6 text-slate-600">
                  {item.quote}
                </p>
                <div className="mt-4 font-semibold text-slate-950">
                  {item.name}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="pricing" className="px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase text-primary">
              Harga & Biaya
            </p>
            <h2 className="font-display text-3xl font-bold text-slate-950">
              Fee transparan untuk setiap transaksi.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              BridgePay menerapkan marketplace fee, escrow milestone, snapshot
              kurs USD-IDR, dan payout lokal dengan perhitungan yang jelas sejak
              awal.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              {
                icon: ShieldCheck,
                label: "Escrow milestone",
                value: "Dana ditahan sampai pekerjaan disetujui.",
              },
              {
                icon: Globe2,
                label: "Snapshot kurs",
                value: "USD-IDR dikunci saat deal/funding escrow.",
              },
              {
                icon: UserRoundCheck,
                label: "KYC payout gate",
                value: "Freelancer perlu verified sebelum pencairan.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
              >
                <item.icon className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold text-slate-950">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
