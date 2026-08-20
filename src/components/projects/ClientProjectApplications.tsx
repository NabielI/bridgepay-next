"use client";

import { BadgeCheck, Loader2, UserRoundCheck, XCircle } from "lucide-react";
import { useState } from "react";

type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface ClientProjectApplicationData {
  id: string;
  coverLetter: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  freelancer: {
    id: string;
    name: string | null;
    email: string;
    skills: string[];
    rate: string | null;
    kycStatus: "pending" | "verified" | "rejected";
  };
}

interface ClientProjectApplicationsProps {
  projectId: string;
  initialProjectStatus: string;
  initialAssignedFreelancerId: string | null;
  initialApplications: ClientProjectApplicationData[];
}

function statusClass(status: ApplicationStatus) {
  if (status === "accepted") {
    return "bg-teal-50 text-primary";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function statusLabel(status: ApplicationStatus) {
  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  if (status === "withdrawn") {
    return "Withdrawn";
  }

  return "Pending";
}

export function ClientProjectApplications({
  projectId,
  initialProjectStatus,
  initialAssignedFreelancerId,
  initialApplications,
}: ClientProjectApplicationsProps) {
  const [projectStatus, setProjectStatus] = useState(initialProjectStatus);
  const [assignedFreelancerId, setAssignedFreelancerId] = useState(
    initialAssignedFreelancerId,
  );
  const [applications, setApplications] = useState(initialApplications);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reviewApplication(
    application: ClientProjectApplicationData,
    action: "accept" | "reject",
  ) {
    setPendingAction(`${application.id}-${action}`);
    setMessage(null);

    const response = await fetch(
      `/api/projects/${projectId}/applications/${application.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      application?: ClientProjectApplicationData & {
        project?: {
          status: string;
          assignedFreelancerId: string | null;
        };
      };
      message?: string;
    } | null;

    setPendingAction(null);

    if (!response.ok || !payload?.application) {
      setMessage(payload?.message ?? "Review lamaran gagal.");
      return;
    }

    setApplications((current) =>
      current.map((item) => {
        if (item.id === payload.application!.id) {
          return { ...item, status: payload.application!.status };
        }

        if (
          action === "accept" &&
          item.status === "pending" &&
          item.id !== payload.application!.id
        ) {
          return { ...item, status: "rejected" };
        }

        return item;
      }),
    );

    if (payload.application.project) {
      setProjectStatus(payload.application.project.status);
      setAssignedFreelancerId(payload.application.project.assignedFreelancerId);
    }

    setMessage(
      action === "accept"
        ? "Freelancer diterima. Project sekarang active."
        : "Lamaran ditolak.",
    );
  }

  if (applications.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Belum ada freelancer yang mengajukan diri.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-950">
            Pelamar Project
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {applications.length} pelamar - status project {projectStatus}
          </p>
        </div>
        {assignedFreelancerId ? (
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-primary">
            Assigned
          </span>
        ) : null}
      </div>

      {message ? (
        <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-primary">
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {applications.map((application) => (
          <article
            key={application.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
            data-testid="project-application-row"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserRoundCheck className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-slate-950">
                    {application.freelancer.name ??
                      application.freelancer.email}
                  </h4>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {application.freelancer.rate ?? "Rate belum diisi"} - KYC{" "}
                  {application.freelancer.kycStatus}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(application.status)}`}
              >
                {statusLabel(application.status)}
              </span>
            </div>

            {application.coverLetter ? (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                {application.coverLetter}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {application.freelancer.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  {skill}
                </span>
              ))}
            </div>

            {application.status === "pending" && projectStatus === "open" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => reviewApplication(application, "accept")}
                  disabled={Boolean(pendingAction)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="accept-application"
                >
                  {pendingAction === `${application.id}-accept` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BadgeCheck className="h-3.5 w-3.5" />
                  )}
                  Terima
                </button>
                <button
                  type="button"
                  onClick={() => reviewApplication(application, "reject")}
                  disabled={Boolean(pendingAction)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="reject-application"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Tolak
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
