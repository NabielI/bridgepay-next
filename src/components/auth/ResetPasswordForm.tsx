"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    setPending(false);
    setSuccess(response.ok);
    setMessage(payload?.message ?? "Reset password gagal diproses.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Reset Password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Buat password baru. Link reset berlaku 30 menit dan hanya bisa
          dipakai satu kali.
        </p>

        {message ? (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              success
                ? "border-teal-200 bg-teal-50 text-teal-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
            data-testid="reset-password-message"
          >
            {message}
          </div>
        ) : null}

        {!token ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Token reset tidak ditemukan.
          </div>
        ) : (
          <form onSubmit={submitResetPassword} className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Password Baru
              </span>
              <input
                required
                minLength={8}
                maxLength={128}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                placeholder="Minimal 8 karakter"
                data-testid="reset-password-input"
              />
            </label>
            <button
              type="submit"
              disabled={pending || success}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="reset-password-submit"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reset Password
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          Kembali ke login
        </Link>
      </section>
    </main>
  );
}
