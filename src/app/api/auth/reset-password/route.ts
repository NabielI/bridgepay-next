import { NextResponse } from "next/server";
import { z } from "zod";

import { resetPasswordWithToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Token atau password tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const reset = await resetPasswordWithToken(
    parsed.data.token,
    parsed.data.password,
  );

  if (!reset) {
    return NextResponse.json(
      { message: "Token reset tidak valid atau sudah kedaluwarsa." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Password berhasil direset. Silakan login kembali.",
  });
}
