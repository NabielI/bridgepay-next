import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { ProjectWorkspaceClient } from "@/components/workspace/ProjectWorkspaceClient";
import { authOptions } from "@/lib/auth";
import {
  ExchangeRateUnavailableError,
  fetchUsdIdrExchangeRate,
} from "@/lib/currency";
import { dashboardPathForRole } from "@/lib/dashboard";
import { canAccessProjectWorkspace } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

const messageSelect = {
  id: true,
  body: true,
  translatedBody: true,
  senderRole: true,
  createdAt: true,
  sender: {
    select: {
      name: true,
      email: true,
    },
  },
};

export default async function WorkspaceProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const viewerRole = session.user.role;

  if (viewerRole !== "client" && viewerRole !== "freelancer") {
    redirect(dashboardPathForRole(viewerRole));
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      budget: true,
      currency: true,
      deadline: true,
      status: true,
      clientId: true,
      assignedFreelancerId: true,
      assignedFreelancer: {
        select: {
          kycStatus: true,
        },
      },
      client: {
        select: {
          name: true,
          email: true,
          company: true,
        },
      },
      escrow: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          exchangeRateSnapshot: true,
          exchangeRateTimestamp: true,
          exchangeRateSource: true,
          paymentTransactions: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              provider: true,
              providerOrderId: true,
              providerRedirectUrl: true,
              amount: true,
              currency: true,
              status: true,
              paidAt: true,
              createdAt: true,
            },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
              id: true,
              actorRole: true,
              fromStatus: true,
              toStatus: true,
              note: true,
              createdAt: true,
              actor: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: messageSelect,
      },
      files: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          uploaderRole: true,
          uploader: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  if (!canAccessProjectWorkspace(project, session.user.id, viewerRole)) {
    redirect("/discovery");
  }

  const todayExchangeRate = await fetchUsdIdrExchangeRate({
    revalidateSeconds: 3600,
  }).catch((error: unknown) => {
    if (error instanceof ExchangeRateUnavailableError) {
      return null;
    }

    throw error;
  });

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="mb-2 text-sm font-semibold uppercase text-primary">
            Project Workspace
          </p>
          <h1 className="text-3xl font-bold text-slate-950">
            {project.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Workspace tersedia untuk role {session.user.role}. Chat history
            disimpan per project dan tetap muncul setelah refresh.
          </p>
        </div>
        <ProjectWorkspaceClient
          role={viewerRole}
          project={{
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            budget: project.budget,
            currency: project.currency,
            deadline: project.deadline.toISOString(),
            status: project.status,
            assignedFreelancerKycStatus:
              project.assignedFreelancer?.kycStatus ?? null,
            client: project.client,
            escrow: project.escrow
              ? {
                  ...project.escrow,
                  exchangeRateSnapshot: project.escrow.exchangeRateSnapshot
                    ? Number(project.escrow.exchangeRateSnapshot)
                    : null,
                  exchangeRateTimestamp:
                    project.escrow.exchangeRateTimestamp?.toISOString() ?? null,
                  paymentTransactions:
                    project.escrow.paymentTransactions.map((payment) => ({
                      ...payment,
                      paidAt: payment.paidAt?.toISOString() ?? null,
                      createdAt: payment.createdAt.toISOString(),
                    })),
                  events: project.escrow.events.map((event) => ({
                    ...event,
                    createdAt: event.createdAt.toISOString(),
                  })),
                }
              : null,
          }}
          initialMessages={project.messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.toISOString(),
          }))}
          initialFiles={project.files.map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
          }))}
          todayExchangeRate={
            todayExchangeRate
              ? {
                  rate: todayExchangeRate.rate,
                  timestamp: todayExchangeRate.timestamp.toISOString(),
                  source: todayExchangeRate.source,
                }
              : null
          }
          viewerKycStatus={session.user.kycStatus ?? null}
        />
      </section>
  );
}
