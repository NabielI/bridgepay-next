import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcrypt";

import { activityLogData } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = 30;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      return false;
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
      select: { id: true },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
      select: { id: true },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId: resetToken.userId,
        actorRole: resetToken.user.role,
        action: "auth.passwordReset.completed",
        entityType: "user",
        entityId: resetToken.userId,
        metadata: {
          resetTokenId: resetToken.id,
        },
      }),
    });

    await tx.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    return true;
  });
}
