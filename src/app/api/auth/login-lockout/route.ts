import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp, getLoginLockout } from "@/lib/login-security";

export const runtime = "nodejs";

const lockoutSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = lockoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ locked: false });
  }

  const headerStore = await headers();
  const ip = getClientIp({
    "x-forwarded-for": headerStore.get("x-forwarded-for") ?? undefined,
    "x-real-ip": headerStore.get("x-real-ip") ?? undefined,
  });
  const lockout = await getLoginLockout(parsed.data.email, ip);

  return NextResponse.json(
    lockout
      ? {
          locked: true,
          minutesRemaining: lockout.minutesRemaining,
          lockedUntil: lockout.lockedUntil.toISOString(),
        }
      : { locked: false },
  );
}
