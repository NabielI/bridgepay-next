export type BridgePayRole = "freelancer" | "client" | "admin";

export function dashboardPathForRole(role?: string | null) {
  if (role === "admin") {
    return "/admin/kyc";
  }

  return role === "client" ? "/client/dashboard" : "/freelancer/dashboard";
}
