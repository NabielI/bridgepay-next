import { Prisma, type ProjectStatus, type Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface InboxConversation {
  project: {
    id: string;
    title: string;
    category: string;
    status: string;
    updatedAt: string;
  };
  counterpart: {
    name: string | null;
    email: string | null;
    role: "client" | "freelancer";
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderRole: Role;
    senderName: string | null;
    senderEmail: string;
  } | null;
  unreadCount: number;
}

const inboxProjectSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  title: true,
  category: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      name: true,
      email: true,
    },
  },
  assignedFreelancer: {
    select: {
      name: true,
      email: true,
    },
  },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderRole: true,
      sender: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
  conversationReadStates: {
    take: 1,
    select: {
      lastReadAt: true,
    },
  },
});

function inboxProjectWhere(
  userId: string,
  role: Role,
): Prisma.ProjectWhereInput | null {
  if (role === "client") {
    return { clientId: userId };
  }

  if (role === "freelancer") {
    return {
      assignedFreelancerId: userId,
      status: { in: ["active", "completed"] satisfies ProjectStatus[] },
    };
  }

  return null;
}

export async function getInboxConversations(
  userId: string,
  role: Role,
): Promise<InboxConversation[]> {
  const where = inboxProjectWhere(userId, role);

  if (!where) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      ...inboxProjectSelect,
      conversationReadStates: {
        where: { userId },
        take: 1,
        select: {
          lastReadAt: true,
        },
      },
    },
  });

  const conversations = await Promise.all(
    projects.map(async (project) => {
      const lastReadAt = project.conversationReadStates[0]?.lastReadAt;
      const unreadCount = await prisma.message.count({
        where: {
          projectId: project.id,
          senderId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      const lastMessage = project.messages[0] ?? null;
      const counterpart =
        role === "client"
          ? {
              name: project.assignedFreelancer?.name ?? null,
              email: project.assignedFreelancer?.email ?? null,
              role: "freelancer" as const,
            }
          : {
              name: project.client.name,
              email: project.client.email,
              role: "client" as const,
            };

      return {
        project: {
          id: project.id,
          title: project.title,
          category: project.category,
          status: project.status,
          updatedAt: project.updatedAt.toISOString(),
        },
        counterpart,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt.toISOString(),
              senderRole: lastMessage.senderRole,
              senderName: lastMessage.sender.name,
              senderEmail: lastMessage.sender.email,
            }
          : null,
        unreadCount,
        sortDate: lastMessage?.createdAt ?? project.updatedAt ?? project.createdAt,
      };
    }),
  );

  return conversations
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    .map((conversation) => ({
      project: conversation.project,
      counterpart: conversation.counterpart,
      lastMessage: conversation.lastMessage,
      unreadCount: conversation.unreadCount,
    }));
}

export async function getUnreadMessageCount(userId: string, role: Role) {
  const conversations = await getInboxConversations(userId, role);

  return conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );
}
