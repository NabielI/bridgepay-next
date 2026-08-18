import { NewProjectForm } from "@/components/dashboard/NewProjectForm";
import { requireDashboardSession } from "@/lib/route-guards";

export default async function ClientNewProjectPage() {
  await requireDashboardSession("client");

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          + Proyek Baru
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Post proyek untuk talenta BridgePay
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Form ini menyimpan project ke database, membuat escrow status pending,
          lalu project muncul di feed freelancer.
        </p>
      </div>
      <NewProjectForm />
    </section>
  );
}
