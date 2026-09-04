import { createHmac } from "node:crypto";

import { prisma } from "@/lib/prisma";

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_LOCKOUT_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function authSecret() {
  return process.env.NEXTAUTH_SECRET ?? "bridgepay-development-secret";
}

function hashIdentifier(value: string) {
  return createHmac("sha256", authSecret())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function getClientIp(
  headers?: Record<string, string | string[] | undefined>,
) {
  const forwardedFor = headers?.["x-forwarded-for"];
  const realIp = headers?.["x-real-ip"];
  const forwardedValue = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor;
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;

  return forwardedValue?.split(",")[0]?.trim() || realIpValue || "unknown";
}

function throttleKey(email: string, ip: string) {
  return {
    emailHash: hashIdentifier(email),
    ipHash: hashIdentifier(ip),
  };
}

export async function getLoginLockout(email: string, ip: string) {
  const now = new Date();
  const throttle = await prisma.loginThrottle.findUnique({
    where: {
      emailHash_ipHash: throttleKey(email, ip),
    },
  });

  if (!throttle?.lockedUntil || throttle.lockedUntil <= now) {
    return null;
  }

  return {
    lockedUntil: throttle.lockedUntil,
    minutesRemaining: Math.max(
      1,
      Math.ceil((throttle.lockedUntil.getTime() - now.getTime()) / 60_000),
    ),
  };
}

export async function recordLoginFailure(email: string, ip: string) {
  const now = new Date();
  const existing = await prisma.loginThrottle.findUnique({
    where: {
      emailHash_ipHash: throttleKey(email, ip),
    },
  });
  const windowStartedAt = new Date(
    now.getTime() - LOGIN_WINDOW_MINUTES * 60 * 1000,
  );
  const failedCount =
    existing && existing.firstFailedAt > windowStartedAt
      ? existing.failedCount + 1
      : 1;
  const lockedUntil =
    failedCount >= MAX_FAILED_ATTEMPTS
      ? new Date(now.getTime() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
      : null;

  await prisma.loginThrottle.upsert({
    where: {
      emailHash_ipHash: throttleKey(email, ip),
    },
    create: {
      ...throttleKey(email, ip),
      failedCount,
      firstFailedAt: now,
      lastFailedAt: now,
      lockedUntil,
    },
    update: {
      failedCount,
      firstFailedAt:
        existing && existing.firstFailedAt > windowStartedAt
          ? existing.firstFailedAt
          : now,
      lastFailedAt: now,
      lockedUntil,
    },
  });

  return lockedUntil;
}

export async function clearLoginFailures(email: string, ip: string) {
  await prisma.loginThrottle.deleteMany({
    where: throttleKey(email, ip),
  });
}
