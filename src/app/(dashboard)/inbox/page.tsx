import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  FolderKanban,
  MessageCircle,
  UserRound,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { getInboxConversations, type InboxConversation } from "@/lib/inbox";

function roleLabel(role: InboxConversation["counterpart"]["role"]) {
  return role === "client" ? "Client" : "Freelancer";
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Belum ada pesan";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function previewText(conversation: InboxConversation) {
  if (!conversation.lastMessage) {
    return "Belum ada pesan di project ini.";
  }

  return conversation.lastMessage.body;
}

export default async function InboxPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "client" && session.user.role !== "freelancer") {
    redirect(dashboardPathForRole(session.user.role));
  }

  const conversations = await getInboxConversations(
    session.user.id,
    session.user.role,
  );
  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase text-primary">
          BridgePay Inbox
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Pesan</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Semua percakapan project yang bisa kamu akses, diurutkan dari
              pesan terbaru.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-primary">
            {unreadTotal} belum dibaca
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-950">
              Percakapan Project
            </h2>
          </div>
          <span className="text-sm text-slate-500">
            {conversations.length} percakapan
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="p-10 text-center">
            <MessageCircle className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <h3 className="font-semibold text-slate-950">
              Belum ada percakapan
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Percakapan akan muncul setelah project punya workspace dan pesan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {conversations.map((conversation) => {
              const lastMessageDate = conversation.lastMessage?.createdAt;
              const counterpartName =
                conversation.counterpart.name ??
                conversation.counterpart.email ??
                "Belum ada counterpart";

              return (
                <Link
                  key={conversation.project.id}
                  href={`/workspace/${conversation.project.id}#chat`}
                  className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  data-testid="inbox-conversation"
                  data-project-id={conversation.project.id}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <FolderKanban className="h-3.5 w-3.5" />
                        {conversation.project.status}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span
                          className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"
                          data-testid="inbox-unread-badge"
                        >
                          {conversation.unreadCount} baru
                        </span>
                      ) : null}
                    </div>
                    <h3 className="truncate font-bold text-slate-950">
                      {conversation.project.title}
                    </h3>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-500">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {roleLabel(conversation.counterpart.role)}:{" "}
                        {counterpartName}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-600">
                      {previewText(conversation)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-500 md:flex-col md:items-end">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {formatTimestamp(lastMessageDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                      Buka chat
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
