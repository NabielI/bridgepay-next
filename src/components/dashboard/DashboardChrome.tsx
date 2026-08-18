"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  Compass,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Shield,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { ReactNode, useState } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";

interface DashboardIdentity {
  name?: string | null;
  email?: string | null;
  role: "freelancer" | "client";
  kycStatus?: "pending" | "verified" | "rejected";
}

interface DashboardChromeProps {
  children: ReactNode;
  user: DashboardIdentity;
}

interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const freelancerMenu = [
  { key: "dashboard", label: "Dashboard", href: "/freelancer/dashboard", icon: LayoutDashboard },
  { key: "gig-builder", label: "Gig Builder AI", href: "/freelancer/gig-builder", icon: Bot },
  { key: "discovery", label: "Discovery Feed", href: "/discovery", icon: Compass },
  { key: "projects", label: "Proyek Saya", href: "/freelancer/projects", icon: FolderKanban },
  { key: "wallet", label: "Wallet", href: "/freelancer/wallet", icon: CreditCard },
  { key: "profile", label: "Profil & Portofolio", href: "/freelancer/profile", icon: UserRoundCheck },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

const clientMenu = [
  { key: "dashboard", label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { key: "new-project", label: "+ Proyek Baru", href: "/client/projects/new", icon: Plus },
  { key: "discovery", label: "Discovery Feed", href: "/discovery", icon: Compass },
  { key: "projects", label: "Proyek Saya", href: "/client/projects", icon: FolderKanban },
  { key: "wallet", label: "Wallet", href: "/client/wallet", icon: CreditCard },
  { key: "profile", label: "Profil", href: "/client/profile", icon: UserRoundCheck },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
] satisfies SidebarItem[];

function isActiveItem(pathname: string, item: SidebarItem) {
  if (item.key === "projects" && pathname.startsWith("/workspace")) {
    return true;
  }

  if (item.href === "/discovery") {
    return pathname === "/discovery";
  }

  if (item.href === "/settings") {
    return pathname === "/settings";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function kycBadgeClass(status?: DashboardIdentity["kycStatus"]) {
  if (status === "verified") {
    return "bg-teal-50 text-primary";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function kycLabel(status?: DashboardIdentity["kycStatus"]) {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

export function DashboardChrome({ children, user }: DashboardChromeProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const expanded = !collapsed || hovered;
  const menu = user.role === "client" ? clientMenu : freelancerMenu;
  const initials = (user.name ?? user.email ?? "BP")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block ${
          expanded ? "w-72" : "w-[86px]"
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-testid="dashboard-sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-950 text-white">
                <Shield className="h-5 w-5" />
              </span>
              {expanded ? (
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold text-slate-950">
                    BridgePay
                  </span>
                  <span
                    className="block truncate text-xs font-semibold uppercase text-primary"
                    data-testid="sidebar-role"
                  >
                    {user.role}
                  </span>
                </span>
              ) : null}
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {menu.map((item) => {
              const active = isActiveItem(pathname, item);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.label}
                  data-testid={`sidebar-item-${item.key}`}
                  className={`group flex h-11 items-center gap-3 rounded-xl border-l-4 px-3 text-sm font-semibold transition ${
                    active
                      ? "border-primary bg-teal-50 text-primary"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  } ${expanded ? "justify-start" : "justify-center"}`}
                >
                  <item.icon
                    className={`h-5 w-5 shrink-0 ${
                      active ? "text-primary" : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  />
                  {expanded ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              data-testid="sidebar-toggle"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              {expanded ? <span>{collapsed ? "Expand" : "Collapse"}</span> : null}
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          expanded ? "lg:pl-72" : "lg:pl-[86px]"
        }`}
      >
        <header
          className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
          data-testid="dashboard-topbar"
        >
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <Link
              href={user.role === "client" ? "/client/dashboard" : "/freelancer/dashboard"}
              className="flex items-center gap-2 font-display text-lg font-bold text-slate-950 lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-navy-950 text-white">
                <Shield className="h-4 w-4" />
              </span>
              BridgePay
            </Link>

            <div className="hidden flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Cari proyek, talent, gig, atau transaksi..."
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                {notificationsOpen ? (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-glass">
                    <div className="font-semibold text-slate-950">
                      Notifikasi
                    </div>
                    <p className="mt-2 text-slate-500">
                      Semua update proyek, escrow, dan KYC akan muncul di sini.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 text-xs font-bold text-white">
                  {initials || "BP"}
                </div>
                <div className="min-w-0">
                  <div className="max-w-40 truncate text-sm font-semibold text-slate-950">
                    {user.name ?? user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize text-slate-500">
                      {user.role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${kycBadgeClass(user.kycStatus)}`}
                    >
                      {kycLabel(user.kycStatus)}
                    </span>
                  </div>
                </div>
              </div>

              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6" data-testid="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
