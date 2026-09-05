import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText, ShieldCheck } from "lucide-react";

import { PrintInvoiceButton } from "@/components/invoices/PrintInvoiceButton";
import { SIMPLIFIED_TAX_LABEL } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { requireDashboardSession } from "@/lib/route-guards";

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

export default async function FreelancerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const session = await requireDashboardSession("freelancer");
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      freelancerId: session.user.id,
    },
    select: {
      id: true,
      invoiceNumber: true,
      amountUsd: true,
      exchangeRateSnapshot: true,
      exchangeRateTimestamp: true,
      exchangeRateSource: true,
      amountIdr: true,
      taxRate: true,
      estimatedTaxIdr: true,
      netEstimatedPayoutIdr: true,
      status: true,
      issuedAt: true,
      project: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
        },
      },
      freelancer: {
        select: {
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          name: true,
          email: true,
          company: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const rate = Number(invoice.exchangeRateSnapshot);
  const taxPercent = Number(invoice.taxRate) * 100;

  return (
    <section className="mx-auto grid max-w-5xl gap-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/freelancer/wallet"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Wallet
        </Link>
        <PrintInvoiceButton />
      </div>

      <article
        className="rounded-2xl border border-slate-200 bg-white shadow-soft print:border-none print:shadow-none"
        data-testid="invoice-detail"
      >
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-primary">
                BridgePay Invoice
              </p>
              <h1 className="text-3xl font-bold text-slate-950">
                {invoice.invoiceNumber}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Diterbitkan {formatDate(invoice.issuedAt)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-slate-500">
              <FileText className="h-4 w-4 text-primary" />
              Detail Project
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="text-slate-500">Project</div>
                <div className="font-semibold text-slate-950">
                  {invoice.project.title}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Kategori</div>
                <div className="font-semibold text-slate-950">
                  {invoice.project.category}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Client</div>
                <div className="font-semibold text-slate-950">
                  {invoice.client.company ??
                    invoice.client.name ??
                    invoice.client.email}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Freelancer</div>
                <div className="font-semibold text-slate-950">
                  {invoice.freelancer.name ?? invoice.freelancer.email}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold uppercase text-slate-500">
              Nominal dan Kurs
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Nominal asli</dt>
                <dd className="font-semibold text-slate-950">
                  {formatUsd(invoice.amountUsd)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Kurs terkunci</dt>
                <dd className="font-semibold text-slate-950">
                  1 USD = {formatIdr(rate)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Waktu kurs</dt>
                <dd className="text-right font-semibold text-slate-950">
                  {formatDate(invoice.exchangeRateTimestamp)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Sumber kurs</dt>
                <dd className="font-semibold text-slate-950">
                  {invoice.exchangeRateSource ?? "BridgePay snapshot"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="border-t border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Ringkasan Payout
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-600">Item</div>
              <div className="text-right font-semibold text-slate-600">
                Nominal
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-200 p-4 text-sm">
              <div className="text-slate-600">
                Nilai transaksi berdasarkan kurs terkunci
              </div>
              <div className="text-right font-semibold text-slate-950">
                {formatIdr(invoice.amountIdr)}
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-200 p-4 text-sm">
              <div className="text-slate-600">
                Estimasi pajak {SIMPLIFIED_TAX_LABEL} ({taxPercent}%)
              </div>
              <div className="text-right font-semibold text-amber-700">
                {formatIdr(invoice.estimatedTaxIdr)}
              </div>
            </div>
            <div className="grid grid-cols-2 bg-teal-50 p-4 text-sm">
              <div className="font-bold text-slate-950">
                Estimasi payout bersih
              </div>
              <div className="text-right text-lg font-bold text-primary">
                {formatIdr(invoice.netEstimatedPayoutIdr)}
              </div>
            </div>
          </div>

          <div
            className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-100 p-6 text-amber-950 shadow-sm"
            data-testid="invoice-tax-disclaimer"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-base font-bold">Estimasi Pajak</h3>
                <p className="mt-2 text-sm leading-6">
                  Angka ini adalah perkiraan PPh Final UMKM 0.5% dari nominal
                  transaksi, dibuat untuk membantu perencanaan keuangan Anda.
                  Ini BUKAN bukti pembayaran pajak resmi dan BridgePay tidak
                  melaporkan pajak ini ke otoritas pajak (DJP) atas nama Anda.
                  Freelancer/client tetap bertanggung jawab untuk melaporkan
                  dan membayar pajak sesuai ketentuan yang berlaku secara
                  mandiri.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
