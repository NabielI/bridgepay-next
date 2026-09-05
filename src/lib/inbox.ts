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

interface CountRow {
  count: bigint | number;
}

interface ProjectUnreadCountRow {
  projectId: string;
  unreadCount: bigint | number;
}

function countValue(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

async function getUnreadCountByProject(userId: string, projectIds: string[]) {
  if (projectIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.$queryRaw<ProjectUnreadCountRow[]>(Prisma.sql`
    SELECT
      m."projectId" AS "projectId",
      COUNT(*) AS "unreadCount"
    FROM "Message" m
    LEFT JOIN "ConversationReadState" crs
      ON crs."projectId" = m."projectId"
      AND crs."userId" = ${userId}
    WHERE
      m."projectId" IN (${Prisma.join(projectIds)})
      AND m."senderId" <> ${userId}
      AND (
        crs."lastReadAt" IS NULL
        OR m."createdAt" > crs."lastReadAt"
      )
    GROUP BY m."projectId"
  `);

  return new Map(
    rows.map((row) => [row.projectId, countValue(row.unreadCount)]),
  );
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
    select: inboxProjectSelect,
  });
  const unreadCounts = await getUnreadCountByProject(
    userId,
    projects.map((project) => project.id),
  );

  const conversations = projects.map((project) => {
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
      unreadCount: unreadCounts.get(project.id) ?? 0,
      sortDate: lastMessage?.createdAt ?? project.updatedAt ?? project.createdAt,
    };
  });

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
  if (role === "client") {
    const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Message" m
      INNER JOIN "Project" p ON p."id" = m."projectId"
      LEFT JOIN "ConversationReadState" crs
        ON crs."projectId" = p."id"
        AND crs."userId" = ${userId}
      WHERE
        p."clientId" = ${userId}
        AND m."senderId" <> ${userId}
        AND (
          crs."lastReadAt" IS NULL
          OR m."createdAt" > crs."lastReadAt"
        )
    `);

    return countValue(rows[0]?.count);
  }

  if (role === "freelancer") {
    const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Message" m
      INNER JOIN "Project" p ON p."id" = m."projectId"
      LEFT JOIN "ConversationReadState" crs
        ON crs."projectId" = p."id"
        AND crs."userId" = ${userId}
      WHERE
        p."assignedFreelancerId" = ${userId}
        AND p."status"::text IN ('active', 'completed')
        AND m."senderId" <> ${userId}
        AND (
          crs."lastReadAt" IS NULL
          OR m."createdAt" > crs."lastReadAt"
        )
    `);

    return countValue(rows[0]?.count);
  }

  return 0;
}
