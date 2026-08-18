import Link from "next/link";
import type { Session } from "next-auth";
import { Compass, LayoutDashboard, Shield } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { dashboardPathForRole } from "@/lib/dashboard";

interface AppNavProps {
  session?: Session | null;
}

export function AppNav({ session }: AppNavProps) {
  const dashboardHref = session?.user?.role
    ? dashboardPathForRole(session.user.role)
    : "/login";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 text-white">
            <Shield className="h-5 w-5" />
          </span>
          BridgePay
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {session?.user ? (
            <>
              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Compass className="h-4 w-4" />
                Discovery
              </Link>
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Landing
              </Link>
              <Link
                href="/#how-it-works"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Bagaimana Cara Kerja
              </Link>
              <Link
                href="/discovery"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Discovery Feed
              </Link>
              <Link
                href="/#pricing"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Harga & Biaya
              </Link>
            </>
          )}
        </nav>
        {session?.user ? (
          <SignOutButton />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Daftar
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
