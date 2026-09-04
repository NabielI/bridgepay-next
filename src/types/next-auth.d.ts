import type { KycStatus, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: Role;
      kycStatus?: KycStatus;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    kycStatus?: KycStatus;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: Role;
    kycStatus?: KycStatus;
    sessionVersion?: number;
    sessionInvalid?: boolean;
  }
}
