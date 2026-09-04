import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  clearLoginFailures,
  getClientIp,
  getLoginLockout,
  recordLoginFailure,
} from "@/lib/login-security";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const ip = getClientIp(req.headers);
        const lockout = await getLoginLockout(parsed.data.email, ip);

        if (lockout) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          await recordLoginFailure(parsed.data.email, ip);
          return null;
        }

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordValid) {
          await recordLoginFailure(parsed.data.email, ip);
          return null;
        }

        await clearLoginFailures(parsed.data.email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          kycStatus: user.kycStatus,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.kycStatus = user.kycStatus;
        token.sessionVersion = user.sessionVersion;
        token.sessionInvalid = false;
        return token;
      }

      if (token.id && !token.sessionInvalid) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            kycStatus: true,
            sessionVersion: true,
          },
        });

        if (!currentUser) {
          token.sessionInvalid = true;
          return token;
        }

        if (
          typeof token.sessionVersion === "number" &&
          token.sessionVersion !== currentUser.sessionVersion
        ) {
          token.sessionInvalid = true;
          return token;
        }

        token.role = currentUser.role;
        token.kycStatus = currentUser.kycStatus;
        token.sessionVersion = currentUser.sessionVersion;
      }

      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        !token.sessionInvalid &&
        token.id &&
        token.role &&
        token.kycStatus
      ) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.kycStatus = token.kycStatus;
        session.user.sessionVersion = token.sessionVersion;
      }

      return session;
    },
  },
};
