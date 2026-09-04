"use client";

import {
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Languages,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { convertUsdToIdr } from "@/lib/currency";

interface WorkspaceProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  deadline: string;
  status: string;
  assignedFreelancerKycStatus: "pending" | "verified" | "rejected" | null;
  client: {
    name: string | null;
    email: string;
    company: string | null;
  };
  escrow: WorkspaceEscrow | null;
}

interface WorkspaceEscrow {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "held" | "released";
  paymentMethod: string;
  exchangeRateSnapshot: number | null;
  exchangeRateTimestamp: string | null;
  exchangeRateSource: string | null;
  paymentTransactions: WorkspacePaymentTransaction[];
  events: WorkspaceEscrowEvent[];
}

interface WorkspacePaymentTransaction {
  id: string;
  provider: string;
  providerOrderId: string;
  providerRedirectUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface WorkspaceEscrowEvent {
  id: string;
  actorRole: "client" | "freelancer";
  fromStatus: "pending" | "held" | "released" | null;
  toStatus: "pending" | "held" | "released";
  note: string;
  createdAt: string;
  actor: {
    name: string | null;
    email: string;
  };
}

interface WorkspaceMessage {
  id: string;
  body: string;
  translatedBody: string | null;
  senderRole: "client" | "freelancer";
  createdAt: string;
  sender: {
    name: string | null;
    email: string;
  };
}

interface WorkspaceProjectFile {
  id: string;
  kind: "deliverable" | "reference";
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderRole: "client" | "freelancer";
  uploader: {
    name: string | null;
    email: string;
  };
}

interface ProjectWorkspaceClientProps {
  role: "client" | "freelancer";
  project: WorkspaceProject;
  initialMessages: WorkspaceMessage[];
  initialFiles: WorkspaceProjectFile[];
  todayExchangeRate: {
    rate: number;
    timestamp: string;
    source: string;
  } | null;
  viewerKycStatus: "pending" | "verified" | "rejected" | null;
}

function roleLabel(role: WorkspaceMessage["senderRole"]) {
  return role === "client" ? "Client" : "Freelancer";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escrowLabel(status?: WorkspaceEscrow["status"]) {
  if (status === "held") {
    return "Held";
  }

  if (status === "released") {
    return "Released";
  }

  return "Pending";
}

function escrowDescription(
  status: WorkspaceEscrow["status"],
  role: ProjectWorkspaceClientProps["role"],
) {
  if (status === "held") {
    return role === "client"
      ? "Dana sudah ditahan BridgePay. Setujui milestone untuk melepas payout."
      : "Dana client sudah aman ditahan BridgePay sampai milestone disetujui.";
  }

  if (status === "released") {
    return role === "client"
      ? "Payout milestone sudah dilepas ke freelancer."
      : "Payout milestone sudah disetujui dan dilepas.";
  }

  return role === "client"
    ? "Dana belum disetor. Fund escrow untuk mulai proteksi milestone."
    : "Client belum menyetor dana escrow untuk project ini.";
}

function escrowStepClass(
  step: WorkspaceEscrow["status"],
  current: WorkspaceEscrow["status"],
) {
  const order = ["pending", "held", "released"];
  return order.indexOf(step) <= order.indexOf(current)
    ? "bg-primary text-white"
    : "bg-slate-100 text-slate-500";
}

function fileKindLabel(kind: WorkspaceProjectFile["kind"]) {
  return kind === "deliverable" ? "Deliverable" : "Reference";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRate(rate: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(rate);
}

function formatPaymentAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentStatusLabel(status?: string) {
  if (status === "settled") {
    return "Paid";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "amount_mismatch") {
    return "Needs Review";
  }

  return "Pending";
}

function paymentStatusClass(status?: string) {
  if (status === "settled") {
    return "bg-teal-50 text-primary";
  }

  if (status === "failed" || status === "amount_mismatch") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export function ProjectWorkspaceClient({
  role,
  project,
  initialMessages,
  initialFiles,
  todayExchangeRate,
  viewerKycStatus,
}: ProjectWorkspaceClientProps) {
  const [messages, setMessages] = useState<WorkspaceMessage[]>(initialMessages);
  const [files, setFiles] = useState<WorkspaceProjectFile[]>(initialFiles);
  const [input, setInput] = useState("");
  const [translated, setTranslated] = useState(false);
  const [pending, setPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<WorkspaceEscrow | null>(project.escrow);
  const [paymentTransactions, setPaymentTransactions] = useState<
    WorkspacePaymentTransaction[]
  >(project.escrow?.paymentTransactions ?? []);
  const [escrowPending, setEscrowPending] = useState<"fund" | "release" | null>(
    null,
  );
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [filePending, setFilePending] = useState(false);
  const [downloadPending, setDownloadPending] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const escrowStatus = escrow?.status ?? "pending";
  const escrowEvents = escrow?.events ?? [];
  const latestPayment = paymentTransactions[0] ?? null;
  const uploadKind = role === "freelancer" ? "deliverable" : "reference";
  const escrowAmount = escrow?.amount ?? project.budget;
  const lockedRate = escrow?.exchangeRateSnapshot ?? null;
  const lockedIdrAmount = lockedRate
    ? convertUsdToIdr(escrowAmount, lockedRate)
    : null;
  const todayIdrAmount = todayExchangeRate
    ? convertUsdToIdr(escrowAmount, todayExchangeRate.rate)
    : null;
  const kycReleaseMessage =
    "Verifikasi KYC diperlukan sebelum dapat menerima pencairan dana.";
  const freelancerNeedsKyc =
    role === "freelancer" && viewerKycStatus !== "verified";
  const assignedFreelancerNeedsKyc =
    role === "client" &&
    project.assignedFreelancerKycStatus !== null &&
    project.assignedFreelancerKycStatus !== "verified";

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      return;
    }

    setPending(true);
    setChatError(null);

    const response = await fetch(`/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: input }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: WorkspaceMessage | string;
    } | null;

    setPending(false);

    if (!response.ok || !payload?.message || typeof payload.message === "string") {
      setChatError(
        (typeof payload?.message === "string" ? payload.message : null) ??
          "Pesan gagal dikirim. Coba lagi.",
      );
      return;
    }

    setMessages((current) => [...current, payload.message as WorkspaceMessage]);
    setInput("");
  }

  async function updateEscrow(action: "fund" | "release") {
    setEscrowPending(action);
    setEscrowError(null);

    const response = await fetch(`/api/projects/${project.id}/escrow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as {
      escrow?: WorkspaceEscrow;
      message?: string;
    } | null;

    setEscrowPending(null);

    if (!response.ok || !payload?.escrow) {
      setEscrowError(payload?.message ?? "Status escrow gagal diperbarui.");
      return;
    }

    setEscrow(payload.escrow);
    setPaymentTransactions(payload.escrow.paymentTransactions ?? []);
  }

  async function startMidtransPayment() {
    setEscrowPending("fund");
    setEscrowError(null);

    const response = await fetch(`/api/projects/${project.id}/payments/midtrans`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      payment?: WorkspacePaymentTransaction;
      message?: string;
    } | null;

    setEscrowPending(null);

    if (!response.ok || !payload?.payment) {
      setEscrowError(payload?.message ?? "Checkout Midtrans gagal dibuat.");
      return;
    }

    setPaymentTransactions((current) => [
      payload.payment!,
      ...current.filter((payment) => payment.id !== payload.payment!.id),
    ]);

    if (payload.payment.providerRedirectUrl) {
      window.open(payload.payment.providerRedirectUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function uploadProjectFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setFileError("Pilih file dulu sebelum upload.");
      return;
    }

    setFilePending(true);
    setFileError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", uploadKind);

    const response = await fetch(`/api/projects/${project.id}/files`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      file?: WorkspaceProjectFile;
      message?: string;
    } | null;

    setFilePending(false);

    if (!response.ok || !payload?.file) {
      setFileError(payload?.message ?? "Upload file gagal.");
      return;
    }

    setFiles((current) => [payload.file!, ...current]);
    form.reset();
  }

  async function downloadProjectFile(file: WorkspaceProjectFile) {
    setDownloadPending(file.id);
    setFileError(null);

    const response = await fetch(
      `/api/projects/${project.id}/files/${file.id}/signed-url`,
      {
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      signedUrl?: string;
      message?: string;
    } | null;

    setDownloadPending(null);

    if (!response.ok || !payload?.signedUrl) {
      setFileError(payload?.message ?? "Signed URL gagal dibuat.");
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-bold text-slate-950">Project Chat</h2>
            <p className="text-sm text-slate-500">
              History tersimpan di database untuk project {project.title}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTranslated((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            data-testid="translation-toggle"
          >
            <Languages className="h-4 w-4" />
            {translated ? "Original" : "Translate"}
          </button>
        </div>
        <div className="grid max-h-[460px] gap-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="font-semibold text-slate-950">
                Belum ada pesan
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Mulai percakapan project. Pesan pertama akan langsung tersimpan
                ke tabel Message.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const ownMessage = message.senderRole === role;
              const senderName = message.sender.name ?? message.sender.email;

              return (
                <article
                  key={message.id}
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    ownMessage
                      ? "ml-auto bg-primary text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                  data-testid="workspace-chat-message"
                >
                  <div
                    className={`mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold ${
                      ownMessage ? "text-teal-50" : "text-slate-500"
                    }`}
                  >
                    <span>{roleLabel(message.senderRole)}</span>
                    <span>{senderName}</span>
                    <time dateTime={message.createdAt}>
                      {formatTimestamp(message.createdAt)}
                    </time>
                  </div>
                  <p>
                    {translated
                      ? message.translatedBody ?? "Translation unavailable."
                      : message.body}
                  </p>
                </article>
              );
            })
          )}
        </div>
        {chatError ? (
          <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {chatError}
          </div>
        ) : null}
        <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-4">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
            placeholder="Tulis update proyek..."
            data-testid="workspace-message"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="workspace-send"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Kirim
          </button>
        </form>
      </section>

      <aside className="grid gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Ringkasan Project</h2>
              <p className="mt-1 text-sm text-slate-500">
                {project.client.company ?? project.client.name ?? project.client.email}
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
              {project.status}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {project.description}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div>Kategori: {project.category}</div>
            <div>
              Budget: {project.currency} {project.budget.toLocaleString("en-US")}
            </div>
            <div>
              Deadline: {new Date(project.deadline).toLocaleDateString("id-ID")}
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Smart Escrow</h2>
              <p className="mt-1 text-sm text-slate-500">
                {escrowDescription(escrowStatus, role)}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary"
              data-testid="escrow-status"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {escrowLabel(escrowStatus)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["pending", "held", "released"] as const).map((step) => (
              <div
                key={step}
                className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${escrowStepClass(step, escrowStatus)}`}
              >
                {escrowLabel(step)}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">
              Jumlah asli: {formatUsd(escrowAmount)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Method: {escrow?.paymentMethod ?? "master_account"}
            </div>
            {latestPayment ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-500">
                    Midtrans Sandbox Payment
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(latestPayment.status)}`}
                  >
                    {paymentStatusLabel(latestPayment.status)}
                  </span>
                </div>
                <div className="mt-1 font-bold text-slate-950">
                  {formatPaymentAmount(latestPayment.amount, latestPayment.currency)}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  Order: {latestPayment.providerOrderId}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestPayment.providerRedirectUrl &&
                  latestPayment.status !== "settled" ? (
                    <a
                      href={latestPayment.providerRedirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      data-testid="midtrans-payment-link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Checkout
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    data-testid="midtrans-payment-refresh"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Status
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-teal-100 bg-white p-3">
                <div className="text-xs font-semibold text-primary">
                  Kurs saat kesepakatan (terkunci)
                </div>
                {lockedRate ? (
                  <>
                    <div className="mt-1 font-bold text-slate-950">
                      1 USD = IDR {formatRate(lockedRate)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Payout terkunci: {formatIdr(lockedIdrAmount ?? 0)}
                    </div>
                    {escrow?.exchangeRateTimestamp ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Dikunci {formatTimestamp(escrow.exchangeRateTimestamp)}
                      </div>
                    ) : null}
                    {escrow?.exchangeRateSource ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Source: {escrow.exchangeRateSource}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-1 text-sm font-semibold text-amber-700">
                    Belum ada snapshot kurs. Fund escrow akan mengambil kurs
                    saat itu sebelum dana ditahan.
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-500">
                  Kurs hari ini (informasi)
                </div>
                {todayExchangeRate ? (
                  <>
                    <div className="mt-1 font-bold text-slate-950">
                      1 USD = IDR {formatRate(todayExchangeRate.rate)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Nilai jika memakai kurs hari ini:{" "}
                      {formatIdr(todayIdrAmount ?? 0)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Source: {todayExchangeRate.source}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">
                    Kurs hari ini belum tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>

          {escrowError ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {escrowError}
            </div>
          ) : null}

          {freelancerNeedsKyc || assignedFreelancerNeedsKyc ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {kycReleaseMessage}
            </div>
          ) : null}

          {role === "client" ? (
            <div className="mt-4">
              {escrowStatus === "pending" ? (
                <button
                  type="button"
                  onClick={startMidtransPayment}
                  disabled={Boolean(escrowPending)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="midtrans-payment-start"
                >
                  {escrowPending === "fund" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Bayar via Midtrans Sandbox
                </button>
              ) : null}
              {escrowStatus === "held" ? (
                <button
                  type="button"
                  onClick={() => updateEscrow("release")}
                  disabled={Boolean(escrowPending) || assignedFreelancerNeedsKyc}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="escrow-release"
                >
                  {escrowPending === "release" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Approve Milestone & Release
                </button>
              ) : null}
              {escrowStatus === "released" ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-primary">
                  Milestone payout sudah released.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Freelancer dapat memantau dana escrow, sementara perubahan status
              hanya bisa dipicu client pemilik project.
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-950">Escrow History</h3>
            {escrowEvents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Belum ada event escrow.
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                {escrowEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-200 p-3 text-sm"
                  >
                    <div className="font-semibold text-slate-950">
                      {escrowLabel(event.fromStatus ?? undefined)} to{" "}
                      {escrowLabel(event.toStatus)}
                    </div>
                    <p className="mt-1 text-slate-600">{event.note}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {roleLabel(event.actorRole)} -{" "}
                      {formatTimestamp(event.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="font-bold text-slate-950">Milestone Tracker</h2>
          <div className="mt-5 grid gap-3">
            {["Discovery", "Design", "Delivery"].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    index === 0 ? "bg-primary" : "bg-slate-300"
                  }`}
                />
                <div className="text-sm font-semibold text-slate-800">{item}</div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="font-bold text-slate-950">Project Files</h2>
          <p className="mt-1 text-sm text-slate-500">
            {role === "freelancer"
              ? "Upload deliverable ke private Supabase Storage."
              : "Upload reference file untuk freelancer."}
          </p>

          <form onSubmit={uploadProjectFile} className="mt-4 grid gap-3">
            <input
              type="file"
              name="file"
              accept=".zip,.pdf,.png,.jpg,.jpeg,.webp,.fig,.doc,.docx"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
              data-testid="project-file-input"
            />
            <button
              type="submit"
              disabled={filePending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="project-file-upload"
            >
              {filePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload {fileKindLabel(uploadKind)}
            </button>
          </form>

          {fileError ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {fileError}
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-950">File History</h3>
            {files.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                <p className="text-sm font-semibold text-slate-950">
                  Belum ada file
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  File yang diupload akan tersimpan di bucket private.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-xl border border-slate-200 p-3"
                    data-testid="project-file-row"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                          {file.fileName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {fileKindLabel(file.kind)} -{" "}
                          {roleLabel(file.uploaderRole)} -{" "}
                          {formatFileSize(file.size)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {file.uploader.name ?? file.uploader.email} -{" "}
                          {formatTimestamp(file.createdAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadProjectFile(file)}
                        disabled={downloadPending === file.id}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid="project-file-download"
                      >
                        {downloadPending === file.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
