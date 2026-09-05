"use client";

import { Printer } from "lucide-react";

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 print:hidden"
      data-testid="invoice-print-button"
    >
      <Printer className="h-4 w-4" />
      Cetak / Simpan PDF
    </button>
  );
}
