import { NextResponse } from "next/server";
import { z } from "zod";

import { logActivity } from "@/lib/activity-log";
import { createPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { EmailDeliveryError, sendPasswordResetEmail } from "@/lib/resend";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

const neutralMessage =
  "Jika email terdaftar, link reset password akan dikirim.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Email tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ message: neutralMessage });
  }

  const { token } = await createPasswordResetToken(user.id);
  const appUrl =
    process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const resetUrl = new URL("/reset-password", appUrl);
  resetUrl.searchParams.set("token", token);

  const delivered = await sendPasswordResetEmail(user.email, resetUrl.toString())
    .then(() => true)
    .catch((error: unknown) => {
      if (error instanceof EmailDeliveryError) {
        return false;
      }

      throw error;
    });

  if (!delivered) {
    return NextResponse.json(
      { message: "Email reset password gagal dikirim. Coba lagi." },
      { status: 503 },
    );
  }

  await logActivity({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.passwordReset.requested",
    entityType: "user",
    entityId: user.id,
    metadata: {
      email: user.email,
    },
  });

  return NextResponse.json({ message: neutralMessage });
}
