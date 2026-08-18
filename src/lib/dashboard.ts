export type BridgePayRole = "freelancer" | "client";

export function dashboardPathForRole(role?: string | null) {
  return role === "client" ? "/client/dashboard" : "/freelancer/dashboard";
}
