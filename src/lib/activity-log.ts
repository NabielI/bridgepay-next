import type { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface ActivityLogInput {
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

export function activityLogData(input: ActivityLogInput) {
  return {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  };
}

export async function logActivity(input: ActivityLogInput) {
  await prisma.activityLog.create({
    data: activityLogData(input),
  });
}
