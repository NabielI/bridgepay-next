import type { ProjectStatus, Role } from "@prisma/client";

interface ProjectAccessInput {
  clientId: string;
  status: ProjectStatus;
  assignedFreelancerId: string | null;
}

export function canAccessProjectWorkspace(
  project: ProjectAccessInput,
  userId: string,
  role: Role,
) {
  if (role === "client") {
    return project.clientId === userId;
  }

  return (
    project.assignedFreelancerId === userId &&
    (project.status === "active" || project.status === "completed")
  );
}
