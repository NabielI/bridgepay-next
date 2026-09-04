"use client";

import {
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export interface AdminKycSubmission {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: "pending" | "verified" | "rejected";
  reviewNote: string | null;
  reviewerRole: "freelancer" | "client" | "admin" | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "freelancer" | "client" | "admin";
    kycStatus: "pending" | "verified" | "rejected";
  };
}

interface AdminKycReviewPanelProps {
  pendingSubmissions: AdminKycSubmission[];
  reviewedSubmissions: AdminKycSubmission[];
}

function statusLabel(status: AdminKycSubmission["status"]) {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function statusClass(status: AdminKycSubmission["status"]) {
  if (status === "verified") {
    return "bg-teal-50 text-primary";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Belum direview";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function updateSubmissionList(
  submissions: AdminKycSubmission[],
  updated: AdminKycSubmission,
) {
  return submissions
    .filter((submission) => submission.id !== updated.id)
    .concat(updated)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function AdminKycReviewPanel({
  pendingSubmissions,
  reviewedSubmissions,
}: AdminKycReviewPanelProps) {
  const [pending, setPending] = useState(pendingSubmissions);
  const [reviewed, setReviewed] = useState(reviewedSubmissions);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function downloadSubmission(submission: AdminKycSubmission) {
    setBusyAction(`${submission.id}-download`);
    setMessage(null);

    const response = await fetch(
      `/api/kyc/submissions/${submission.id}/signed-url`,
      { method: "POST" },
    );
    const payload = (await response.json().catch(() => null)) as {
      signedUrl?: string;
      message?: string;
    } | null;

    setBusyAction(null);

    if (!response.ok || !payload?.signedUrl) {
      setMessage(payload?.message ?? "Signed URL KYC gagal dibuat.");
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function reviewSubmission(
    submission: AdminKycSubmission,
    action: "verify" | "reject",
  ) {
    const note = notes[submission.id]?.trim();

    if (action === "reject" && !note) {
      setMessage("Catatan wajib diisi sebelum menolak KYC.");
      return;
    }

    setBusyAction(`${submission.id}-${action}`);
    setMessage(null);

    const response = await fetch(`/api/kyc/submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const payload = (await response.json().catch(() => null)) as {
      kycStatus?: AdminKycSubmission["status"];
      submission?: AdminKycSubmission;
      message?: string;
    } | null;

    setBusyAction(null);

    if (!response.ok || !payload?.submission || !payload.kycStatus) {
      setMessage(payload?.message ?? "Review KYC gagal.");
      return;
    }

    const updatedSubmission = {
      ...payload.submission,
      user: {
        ...payload.submission.user,
        kycStatus: payload.kycStatus,
      },
    };

    setPending((current) =>
      current.filter((item) => item.id !== updatedSubmission.id),
    );
    setReviewed((current) => updateSubmissionList(current, updatedSubmission));
    setNotes((current) => {
      const next = { ...current };
      delete next[submission.id];
      return next;
    });
    setMessage(`KYC ${payload.kycStatus}. ActivityLog sudah dicatat.`);
  }

  function renderSubmission(submission: AdminKycSubmission, isPending: boolean) {
    const userName = submission.user.name ?? submission.user.email;

    return (
      <article
        key={submission.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
        data-testid="admin-kyc-row"
        data-submission-id={submission.id}
        data-user-email={submission.user.email}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <UserRoundCheck className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-slate-950">{userName}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                {submission.user.role}
              </span>
            </div>
            <p className="mt-1 break-words text-sm text-slate-500">
              {submission.user.email}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(submission.status)}`}
          >
            {statusLabel(submission.status)}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-950">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{submission.fileName}</span>
          </div>
          <div className="mt-2 grid gap-1 text-xs">
            <span>
              {submission.mimeType} - {formatFileSize(submission.size)}
            </span>
            <span>Uploaded {formatTimestamp(submission.createdAt)}</span>
            <span>Reviewed {formatTimestamp(submission.reviewedAt)}</span>
          </div>
          {submission.reviewNote ? (
            <p className="mt-3 text-sm text-slate-700">
              Catatan: {submission.reviewNote}
            </p>
          ) : null}
        </div>

        {isPending ? (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Catatan review
            </span>
            <textarea
              value={notes[submission.id] ?? ""}
              onChange={(event) =>
                setNotes((current) => ({
                  ...current,
                  [submission.id]: event.target.value,
                }))
              }
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-500/20"
              placeholder="Opsional untuk verify, wajib untuk reject."
              data-testid="admin-kyc-note"
            />
          </label>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadSubmission(submission)}
            disabled={Boolean(busyAction)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="admin-kyc-download"
          >
            {busyAction === `${submission.id}-download` ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download
          </button>

          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => reviewSubmission(submission, "verify")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="admin-kyc-verify"
              >
                {busyAction === `${submission.id}-verify` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BadgeCheck className="h-3.5 w-3.5" />
                )}
                Verify
              </button>
              <button
                type="button"
                onClick={() => reviewSubmission(submission, "reject")}
                disabled={Boolean(busyAction)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="admin-kyc-reject"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Pending Review
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submission yang menunggu keputusan admin.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {pending.length} pending
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Tidak ada submission pending.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((submission) => renderSubmission(submission, true))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">Recent Reviewed</h2>
          <p className="mt-1 text-sm text-slate-500">
            Riwayat keputusan KYC terbaru.
          </p>
        </div>
        {reviewed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Belum ada submission yang direview.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviewed.map((submission) => renderSubmission(submission, false))}
          </div>
        )}
      </section>
    </div>
  );
}
