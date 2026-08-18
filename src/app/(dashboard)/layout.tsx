import type { ReactNode } from "react";
import { getServerSession } from "next-auth";

import { AppNav } from "@/components/AppNav";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return (
      <>
        <AppNav session={null} />
        {children}
      </>
    );
  }

  return (
    <DashboardChrome
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
      }}
    >
      {children}
    </DashboardChrome>
  );
}
