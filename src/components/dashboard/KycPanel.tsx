"use client";

import { BadgeCheck, Download, FileText, Loader2, Upload } from "lucide-react";
import { FormEvent, useState } from "react";

export interface KycSubmissionData {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: "pending" | "verified" | "rejected";
  reviewNote: string | null;
  reviewerRole: "freelancer" | "client" | "admin" | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface KycPanelProps {
  initialStatus: "pending" | "verified" | "rejected";
  initialSubmissions: KycSubmissionData[];
}

function statusLabel(status: KycSubmissionData["status"]) {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function statusClass(status: KycSubmissionData["status"]) {
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

export function KycPanel({
  initialStatus,
  initialSubmissions,
}: KycPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [uploadPending, setUploadPending] = useState(false);
  const [downloadPending, setDownloadPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setMessage("Pilih dokumen identitas dulu.");
      return;
    }

    setUploadPending(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/kyc/submissions", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      kycStatus?: KycSubmissionData["status"];
      submission?: KycSubmissionData;
      message?: string;
    } | null;

    setUploadPending(false);

    if (!response.ok || !payload?.submission || !payload.kycStatus) {
      setMessage(payload?.message ?? "Upload KYC gagal.");
      return;
    }

    setStatus(payload.kycStatus);
    setSubmissions((current) => [payload.submission!, ...current]);
    setMessage("Dokumen KYC berhasil diupload dan menunggu review.");
    form.reset();
  }

  async function downloadSubmission(submission: KycSubmissionData) {
    setDownloadPending(submission.id);
    setMessage(null);

    const response = await fetch(
      `/api/kyc/submissions/${submission.id}/signed-url`,
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
      setMessage(payload?.message ?? "Signed URL KYC gagal dibuat.");
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">KYC Verification</h2>
          <p className="mt-1 text-sm text-slate-500">
            Dokumen identitas disimpan di bucket private dengan signed URL.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
          data-testid="kyc-status-badge"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {statusLabel(status)}
        </span>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      ) : null}

      <form onSubmit={uploadKyc} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="file"
          name="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
          data-testid="kyc-file-input"
        />
        <button
          type="submit"
          disabled={uploadPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="kyc-upload-submit"
        >
          {uploadPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload KYC
        </button>
      </form>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-slate-950">Submission History</h3>
        {submissions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-semibold text-slate-950">
              Belum ada dokumen KYC
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Upload KTP atau dokumen identitas untuk memulai review.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-slate-200 p-4"
                data-testid="kyc-submission-row"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {submission.fileName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {submission.mimeType} - {formatFileSize(submission.size)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Uploaded {formatTimestamp(submission.createdAt)}
                    </div>
                    {submission.reviewNote ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {submission.reviewNote}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(submission.status)}`}
                  >
                    {statusLabel(submission.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadSubmission(submission)}
                    disabled={downloadPending === submission.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="kyc-download"
                  >
                    {downloadPending === submission.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
