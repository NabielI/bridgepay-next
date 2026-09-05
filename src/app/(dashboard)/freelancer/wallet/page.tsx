import Link from "next/link";
import { CreditCard, FileText, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

function statusClass(status: string) {
  if (status === "released") {
    return "bg-teal-50 text-primary";
  }

  if (status === "held") {
    return "bg-indigo-50 text-indigo-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(value);
}

export default async function FreelancerWalletPage() {
  const session = await requireDashboardSession("freelancer");
  const [escrows, invoices] = await Promise.all([
    prisma.escrow.findMany({
      where: {
        project: {
          assignedFreelancerId: session.user.id,
          status: { in: ["open", "active", "completed"] },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        project: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { freelancerId: session.user.id },
      orderBy: { issuedAt: "desc" },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        amountUsd: true,
        amountIdr: true,
        estimatedTaxIdr: true,
        netEstimatedPayoutIdr: true,
        issuedAt: true,
        project: {
          select: {
            title: true,
            category: true,
          },
        },
      },
    }),
  ]);
  const availableBalance = escrows.reduce(
    (sum, escrow) => (escrow.status === "released" ? sum + escrow.amount : sum),
    0,
  );
  const protectedFunds = escrows.reduce(
    (sum, escrow) => (escrow.status === "held" ? sum + escrow.amount : sum),
    0,
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Payment
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Wallet Freelancer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Saldo dan payout milestone diturunkan dari status Smart Escrow project
          yang bisa kamu akses di prototype.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Saldo Released", value: `$${availableBalance.toLocaleString("en-US")}` },
          { label: "Dana Terproteksi", value: `$${protectedFunds.toLocaleString("en-US")}` },
          { label: "Milestone Tercatat", value: escrows.length },
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
            Riwayat Payout
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Status pending, held, dan released mengikuti data escrow database.
          </p>
        </div>
        {escrows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada payout yang bisa ditampilkan.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {escrows.map((escrow) => (
              <div key={escrow.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="font-semibold text-slate-950">
                    {escrow.project.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {escrow.project.category} - {escrow.paymentMethod}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(escrow.status)}`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {escrow.status}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {escrow.currency} {escrow.amount.toLocaleString("en-US")}
                  </span>
                  <Link
                    href={`/workspace/${escrow.project.id}`}
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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Invoice Payout
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Invoice otomatis muncul setelah escrow project dilepas ke
            freelancer.
          </p>
        </div>
        {invoices.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada invoice. Invoice akan dibuat otomatis saat escrow
            released.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
                data-testid="wallet-invoice-row"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="font-semibold text-slate-950">
                      {invoice.invoiceNumber}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {invoice.project.title} - {invoice.project.category} -
                    diterbitkan {formatDate(invoice.issuedAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">
                      USD {invoice.amountUsd.toLocaleString("en-US")}
                    </div>
                    <div className="text-xs text-slate-500">
                      Pajak est. {formatIdr(invoice.estimatedTaxIdr)} - bersih{" "}
                      {formatIdr(invoice.netEstimatedPayoutIdr)}
                    </div>
                  </div>
                  <Link
                    href={`/freelancer/invoices/${invoice.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    data-testid="wallet-invoice-detail-link"
                  >
                    Lihat Invoice
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
