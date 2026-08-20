"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { useState } from "react";

type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

interface ProjectApplyButtonProps {
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  initialApplication: {
    id: string;
    status: ApplicationStatus;
  } | null;
}

export function ProjectApplyButton({
  projectId,
  projectTitle,
  projectStatus,
  initialApplication,
}: ProjectApplyButtonProps) {
  const [application, setApplication] = useState(initialApplication);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function applyToProject() {
    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/projects/${projectId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coverLetter: `Saya tertarik mengerjakan ${projectTitle} melalui BridgePay.`,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      application?: {
        id: string;
        status: ApplicationStatus;
      };
      message?: string;
    } | null;

    setPending(false);

    if (!response.ok || !payload?.application) {
      setMessage(payload?.message ?? "Lamaran gagal dikirim.");
      return;
    }

    setApplication(payload.application);
    setMessage(payload.message ?? "Lamaran berhasil dikirim.");
  }

  if (application?.status === "accepted") {
    return (
      <Link
        href={`/workspace/${projectId}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        data-testid="open-accepted-workspace"
      >
        <CheckCircle2 className="h-4 w-4" />
        Buka Workspace
      </Link>
    );
  }

  if (application?.status === "pending") {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-700">
        Lamaran Pending
      </div>
    );
  }

  if (application?.status === "rejected") {
    return (
      <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        <XCircle className="h-4 w-4" />
        Tidak Diterima
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      <button
        type="button"
        onClick={applyToProject}
        disabled={pending || projectStatus !== "open"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="apply-project-button"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Ajukan Diri
      </button>
      {message ? (
        <p className="text-center text-xs font-semibold text-slate-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
