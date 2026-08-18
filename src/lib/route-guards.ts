import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { dashboardPathForRole, type BridgePayRole } from "@/lib/dashboard";

export async function requireDashboardSession(role?: BridgePayRole) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (role && session.user.role !== role) {
    redirect(dashboardPathForRole(session.user.role));
  }

  return session;
}
