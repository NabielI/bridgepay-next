import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where:
      session.user.role === "client"
        ? { clientId: session.user.id }
        : { status: { in: ["open", "active"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!project) {
    redirect(session.user.role === "client" ? "/client/dashboard" : "/discovery");
  }

  redirect(`/workspace/${project.id}`);
}
