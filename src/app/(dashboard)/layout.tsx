import type { ReactNode } from "react";
import { getServerSession } from "next-auth";

import { AppNav } from "@/components/AppNav";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
import { authOptions } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/inbox";

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

  const unreadMessages =
    session.user.role === "client" || session.user.role === "freelancer"
      ? await getUnreadMessageCount(session.user.id, session.user.role)
      : 0;

  return (
    <DashboardChrome
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
      }}
      unreadMessages={unreadMessages}
    >
      {children}
    </DashboardChrome>
  );
}
