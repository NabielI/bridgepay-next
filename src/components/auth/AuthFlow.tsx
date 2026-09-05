"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type UserRole = "freelancer" | "client";
type AuthMode = "register" | "login";
type Step = "role" | "form" | "onboarding" | "kyc" | "login";

interface AuthFlowProps {
  mode: AuthMode;
}

const aiQuestions: Record<UserRole, { q: string; key: string }[]> = {
  freelancer: [
    {
      q: "Apa keahlian utamamu? Contoh: UI/UX Design, Web Development, Copywriting.",
      key: "skills",
    },
    {
      q: "Berapa rate atau budget proyek yang kamu harapkan?",
      key: "rate",
    },
  ],
  client: [
    {
      q: "Kamu mewakili perusahaan atau individu apa?",
      key: "company",
    },
    {
      q: "Berapa budget range proyek yang biasa kamu butuhkan?",
      key: "budget",
    },
  ],
};

function dashboardCopy(role: UserRole) {
  return role === "client" ? "Client" : "Freelancer";
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min 8 karakter", ok: password.length >= 8 },
    { label: "Huruf besar", ok: /[A-Z]/.test(password) },
    { label: "Angka", ok: /[0-9]/.test(password) },
    { label: "Simbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter((check) => check.ok).length;

  return (
    <div className="mt-2">
      <div className="mb-2 flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-all ${
              index < strength ? "bg-primary" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-1 text-xs ${
              check.ok ? "text-primary" : "text-slate-400"
            }`}
          >
            <Check className="h-3 w-3" />
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(20,184,166,0.28),transparent_42%),radial-gradient(ellipse_at_80%_75%,rgba(79,70,229,0.20),transparent_45%)]" />
      <div className="relative">
        <Link href="/" className="mb-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Shield className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold">BridgePay</span>
        </Link>
        <h2 className="mb-4 max-w-md text-4xl font-bold leading-tight">
          Escrow transparan untuk kerja lintas negara.
        </h2>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          Akun dibuat dari role yang kamu pilih, disimpan ke Supabase, lalu
          session login diarahkan ke dashboard yang sesuai.
        </p>
      </div>
      <div className="relative grid gap-3">
        {[
          ["KYC", "Admin review aktif"],
          ["Sandbox", "Midtrans escrow demo"],
          ["Role", "Client atau freelancer"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur"
          >
            <div className="font-display text-2xl font-bold">{value}</div>
            <div className="text-sm text-slate-300">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthFlow({ mode }: AuthFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === "login" ? "login" : "role");
  const [role, setRole] = useState<UserRole>("freelancer");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [aiStep, setAiStep] = useState(0);
  const [aiInput, setAiInput] = useState("");
  const [kycUploaded, setKycUploaded] = useState(false);
  const [kycFileName, setKycFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const questions = useMemo(() => aiQuestions[role], [role]);
  const currentQuestion = questions[aiStep];

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateBaseForm() {
    if (!form.name || !form.email || !form.password || !form.phone) {
      setMessage("Lengkapi semua field terlebih dahulu.");
      return false;
    }

    if (form.password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return false;
    }

    setMessage(null);
    return true;
  }

  function handleBaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validateBaseForm()) {
      setStep("onboarding");
    }
  }

  function handleAiSend() {
    if (!currentQuestion || !aiInput.trim()) {
      return;
    }

    setAiAnswers((current) => ({
      ...current,
      [currentQuestion.key]: aiInput.trim(),
    }));
    setAiInput("");

    if (aiStep < questions.length - 1) {
      setAiStep((current) => current + 1);
    } else {
      setStep("kyc");
    }
  }

  function handleAiKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAiSend();
    }
  }

  async function signInAndRedirect() {
    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (!result?.ok) {
      setMessage("Akun dibuat, tapi login otomatis gagal. Coba masuk manual.");
      setStep("login");
      return;
    }

    router.replace("/auth/redirect");
    router.refresh();
  }

  async function checkLoginLockout(email: string) {
    const response = await fetch("/api/auth/login-lockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json().catch(() => null)) as {
      locked?: boolean;
      minutesRemaining?: number;
    } | null;

    if (payload?.locked) {
      const minutes = payload.minutesRemaining ?? 1;
      return `Terlalu banyak percobaan gagal, coba lagi dalam ${minutes} menit`;
    }

    return null;
  }

  async function handleRegisterComplete() {
    if (!kycUploaded) {
      setMessage("Upload dokumen KYC dulu untuk menyelesaikan pendaftaran.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        role,
        onboarding: aiAnswers,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    if (!response.ok) {
      setPending(false);
      setMessage(payload?.message ?? "Register gagal.");
      return;
    }

    await signInAndRedirect();
    setPending(false);
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const existingLockout = await checkLoginLockout(form.email);

    if (existingLockout) {
      setPending(false);
      setMessage(existingLockout);
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setPending(false);

    if (!result?.ok) {
      const currentLockout = await checkLoginLockout(form.email);
      setMessage(currentLockout ?? "Email atau password salah.");
      return;
    }

    router.replace("/auth/redirect");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <VisualPanel />
      <section className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-md">
          {message ? (
            <div
              className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              data-testid="auth-message"
            >
              {message}
            </div>
          ) : null}

          {step === "role" ? (
            <div>
              <h1 className="mb-2 text-2xl font-bold text-slate-950">
                Daftar ke BridgePay
              </h1>
              <p className="mb-8 text-sm leading-6 text-slate-500">
                Pilih role resmi untuk akun baru. Pilihan ini yang akan
                disimpan di tabel User.
              </p>
              <div className="mb-6 grid grid-cols-2 gap-4">
                {[
                  {
                    value: "freelancer" as const,
                    icon: User,
                    title: "Freelancer",
                    desc: "Saya ingin mencari proyek.",
                  },
                  {
                    value: "client" as const,
                    icon: Briefcase,
                    title: "Client",
                    desc: "Saya ingin merekrut talenta.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-testid={`role-${option.value}`}
                    onClick={() => setRole(option.value)}
                    className={`rounded-lg border-2 p-5 text-left transition ${
                      role === option.value
                        ? "border-primary bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                        role === option.value
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <option.icon className="h-5 w-5" />
                    </span>
                    <span className="mb-1 block font-semibold text-slate-900">
                      {option.title}
                    </span>
                    <span className="block text-xs leading-5 text-slate-500">
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-testid="continue-role"
                onClick={() => setStep("form")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700"
              >
                Lanjut sebagai {dashboardCopy(role)}
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="mt-6 text-center text-sm text-slate-500">
                Sudah punya akun?{" "}
                <Link
                  className="font-semibold text-primary hover:underline"
                  href="/login"
                >
                  Masuk
                </Link>
              </p>
            </div>
          ) : null}

          {step === "form" ? (
            <form onSubmit={handleBaseSubmit}>
              <button
                type="button"
                onClick={() => setStep("role")}
                className="mb-6 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </button>
              <h1 className="mb-1 text-2xl font-bold text-slate-950">
                Data Diri
              </h1>
              <p className="mb-6 text-sm text-slate-500">
                Mendaftar sebagai{" "}
                <span className="font-semibold capitalize text-primary">
                  {role}
                </span>
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nama Lengkap
                  </span>
                  <input
                    required
                    data-testid="register-name"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Nabila Client"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    data-testid="register-email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                    placeholder="nama@email.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <span className="relative block">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      data-testid="register-password"
                      value={form.password}
                      onChange={(event) =>
                        updateForm("password", event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Minimal 8 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </span>
                  {form.password ? (
                    <PasswordStrength password={form.password} />
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    No. Telepon
                  </span>
                  <input
                    required
                    type="tel"
                    data-testid="register-phone"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                    placeholder="+62 812 0000 0000"
                  />
                </label>
              </div>
              <div className="mt-3 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <button
                type="submit"
                data-testid="continue-basic"
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700"
              >
                Lanjut ke Onboarding AI
              </button>
            </form>
          ) : null}

          {step === "onboarding" ? (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                  AI
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    ARIA - AI Assistant
                  </div>
                  <div className="text-xs text-primary">
                    Onboarding {dashboardCopy(role)}
                  </div>
                </div>
              </div>
              <div className="mb-4 rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-800">
                {currentQuestion?.q}
              </div>
              <input
                data-testid="ai-answer"
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                onKeyDown={handleAiKeyDown}
                className="mb-3 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                placeholder="Ketik jawaban..."
              />
              <button
                type="button"
                data-testid="ai-send"
                onClick={handleAiSend}
                className="w-full rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700"
              >
                {aiStep < questions.length - 1 ? "Kirim Jawaban" : "Lanjut KYC"}
              </button>
              <div className="mt-4 h-1 rounded-full bg-slate-100">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{ width: `${((aiStep + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {step === "kyc" ? (
            <div>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-teal-50">
                  <BadgeCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-slate-950">
                  Verifikasi KYC
                </h1>
                <p className="text-sm leading-6 text-slate-500">
                  Lampirkan dokumen identitas untuk review. Status KYC akun
                  akan disimpan sebagai pending di database.
                </p>
              </div>
              <label
                data-testid="kyc-upload"
                className={`mb-4 block w-full cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition ${
                  kycUploaded
                    ? "border-primary bg-teal-50"
                    : "border-slate-200 hover:border-teal-300"
                }`}
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setKycUploaded(Boolean(file));
                    setKycFileName(file?.name ?? "");
                  }}
                />
                <Upload className="mx-auto mb-2 h-6 w-6 text-primary" />
                <span className="block text-sm font-semibold text-slate-800">
                  KTP / Kartu Identitas
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {kycUploaded
                    ? `${kycFileName || "Dokumen"} siap direview`
                    : "Klik untuk pilih dokumen"}
                </span>
              </label>
              <button
                type="button"
                data-testid="finish-register"
                disabled={pending}
                onClick={handleRegisterComplete}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Selesai & Masuk ke Dashboard
              </button>
            </div>
          ) : null}

          {step === "login" ? (
            <form onSubmit={handleLoginSubmit}>
              <h1 className="mb-2 text-2xl font-bold text-slate-950">
                Selamat Datang Kembali
              </h1>
              <p className="mb-8 text-sm text-slate-500">
                Login memakai credentials provider dan role dari database.
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    data-testid="login-email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                    placeholder="nama@email.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <span className="relative block">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      data-testid="login-password"
                      value={form.password}
                      onChange={(event) =>
                        updateForm("password", event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Password akun"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </span>
                  <Link
                    href="/forgot-password"
                    className="mt-2 block text-right text-sm font-semibold text-primary hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </label>
              </div>
              <button
                type="submit"
                data-testid="login-submit"
                disabled={pending}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Masuk
              </button>
              <p className="mt-6 text-center text-sm text-slate-500">
                Belum punya akun?{" "}
                <Link
                  className="font-semibold text-primary hover:underline"
                  href="/register"
                >
                  Daftar gratis
                </Link>
              </p>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
