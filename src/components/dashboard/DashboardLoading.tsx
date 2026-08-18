import { Loader2 } from "lucide-react";

export function DashboardLoading({ label = "Memuat data" }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </main>
  );
}
