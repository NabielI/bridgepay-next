import type { ProjectStatus, Role } from "@prisma/client";

interface ProjectAccessInput {
  clientId: string;
  status: ProjectStatus;
}

export function canAccessProjectWorkspace(
  project: ProjectAccessInput,
  userId: string,
  role: Role,
) {
  if (role === "client") {
    return project.clientId === userId;
  }

  return project.status === "open" || project.status === "active";
}
