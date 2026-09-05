import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    name: string | null;
    email: string | null;
  } | null;
}

interface NotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  href?: string | null;
  allowSelf?: boolean;
}

type NotificationClient = Pick<Prisma.TransactionClient, "notification">;

const dashboardNotificationSelect = Prisma.validator<Prisma.NotificationSelect>()({
  id: true,
  type: true,
  title: true,
  message: true,
  entityType: true,
  entityId: true,
  href: true,
  readAt: true,
  createdAt: true,
  actor: {
    select: {
      name: true,
      email: true,
    },
  },
});

export function notificationData(input: NotificationInput) {
  return {
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    href: input.href ?? null,
  };
}

export async function createNotification(
  client: NotificationClient,
  input: NotificationInput,
) {
  if (!input.allowSelf && input.recipientId === input.actorId) {
    return null;
  }

  return client.notification.create({
    data: notificationData(input),
    select: { id: true },
  });
}

export async function createNotifications(
  client: NotificationClient,
  inputs: NotificationInput[],
) {
  const uniqueInputs = inputs.filter(
    (input, index, all) =>
      (input.allowSelf || input.recipientId !== input.actorId) &&
      all.findIndex(
        (candidate) =>
          candidate.recipientId === input.recipientId &&
          candidate.type === input.type &&
          candidate.entityType === input.entityType &&
          candidate.entityId === input.entityId,
      ) === index,
  );

  if (uniqueInputs.length === 0) {
    return { count: 0 };
  }

  return client.notification.createMany({
    data: uniqueInputs.map(notificationData),
  });
}

export async function getDashboardNotifications(
  userId: string,
  take = 5,
): Promise<DashboardNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take,
    select: dashboardNotificationSelect,
  });

  return notifications.map((notification) => ({
    ...notification,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  }));
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      readAt: null,
    },
  });
}
