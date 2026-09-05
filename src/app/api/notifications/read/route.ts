import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const markReadSchema = z.object({
  notificationId: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = markReadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Request notifikasi tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await prisma.notification.updateMany({
    where: {
      recipientId: session.user.id,
      readAt: null,
      ...(parsed.data.notificationId ? { id: parsed.data.notificationId } : {}),
    },
    data: {
      readAt: new Date(),
    },
  });

  if (parsed.data.notificationId && result.count === 0) {
    return NextResponse.json(
      { message: "Notifikasi tidak ditemukan atau bukan milik user ini." },
      { status: 404 },
    );
  }

  return NextResponse.json({ updatedCount: result.count });
}
