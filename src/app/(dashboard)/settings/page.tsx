import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { requireDashboardSession } from "@/lib/route-guards";

export default async function SettingsPage() {
  const session = await requireDashboardSession();
  const role = session.user.role as "freelancer" | "client";

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          Settings
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Preferensi akun BridgePay
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Pengaturan shared untuk role {role}, tetap berada di
          layout dashboard yang sama.
        </p>
      </div>
      <SettingsPanel role={role} />
    </section>
  );
}
