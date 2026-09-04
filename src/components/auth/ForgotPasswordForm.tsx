"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    setPending(false);
    setMessage(
      payload?.message ??
        (response.ok
          ? "Jika email terdaftar, link reset password akan dikirim."
          : "Reset password gagal diproses."),
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Lupa Password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Masukkan email akun BridgePay untuk menerima link reset password.
        </p>

        {message ? (
          <div
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            data-testid="forgot-password-message"
          >
            {message}
          </div>
        ) : null}

        <form onSubmit={submitForgotPassword} className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
              placeholder="nama@email.com"
              data-testid="forgot-password-email"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="forgot-password-submit"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kirim Link Reset
          </button>
        </form>

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
