import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

function statusClass(status: string) {
  if (status === "released" || status === "held") {
    return "bg-teal-50 text-primary";
  }

  return "bg-amber-50 text-amber-700";
}

export default async function ClientWalletPage() {
  const session = await requireDashboardSession("client");
  const projects = await prisma.project.findMany({
    where: { clientId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      budget: true,
      currency: true,
      escrow: {
        select: {
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          updatedAt: true,
        },
      },
    },
  });
  const totalSpending = projects.reduce((sum, project) => sum + project.budget, 0);
  const heldBalance = projects.reduce(
    (sum, project) =>
      project.escrow?.status === "held" ? sum + project.escrow.amount : sum,
    0,
  );
  const released = projects.reduce(
    (sum, project) =>
      project.escrow?.status === "released" ? sum + project.escrow.amount : sum,
    0,
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Payment
        </p>
        <h1 className="text-3xl font-bold text-slate-950">Wallet Client</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Ringkasan saldo dan riwayat escrow dari project yang kamu post.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Spending", value: `$${totalSpending.toLocaleString("en-US")}` },
          { label: "Escrow Held", value: `$${heldBalance.toLocaleString("en-US")}` },
          { label: "Released Payout", value: `$${released.toLocaleString("en-US")}` },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
          >
            <CreditCard className="mb-4 h-5 w-5 text-primary" />
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">
              {item.value}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Riwayat Pembayaran
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Master Account, QRIS Cross-Border, dan milestone payout ditampilkan
            dari data escrow.
          </p>
        </div>
        {projects.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada transaksi. Buat project pertama untuk mulai mencatat
            escrow.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="font-semibold text-slate-950">
                    {project.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {project.escrow?.paymentMethod ?? "master_account"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(project.escrow?.status ?? "pending")}`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {project.escrow?.status ?? "pending"}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {project.currency} {project.budget.toLocaleString("en-US")}
                  </span>
                  <Link
                    href={`/workspace/${project.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
