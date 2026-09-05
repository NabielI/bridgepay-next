import type { ReactNode } from "react";
import { getServerSession } from "next-auth";

import { AppNav } from "@/components/AppNav";
import { DashboardChrome } from "@/components/dashboard/DashboardChrome";
import { authOptions } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/inbox";
import {
  getDashboardNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";

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

  const [unreadMessages, notifications, unreadNotificationCount] =
    await Promise.all([
      session.user.role === "client" || session.user.role === "freelancer"
        ? getUnreadMessageCount(session.user.id, session.user.role)
        : Promise.resolve(0),
      getDashboardNotifications(session.user.id),
      getUnreadNotificationCount(session.user.id),
    ]);

  return (
    <DashboardChrome
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        kycStatus: session.user.kycStatus,
      }}
      unreadMessages={unreadMessages}
      notifications={notifications}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </DashboardChrome>
  );
}
