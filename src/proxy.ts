import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { dashboardPathForRole } from "@/lib/dashboard";

const protectedPrefixes = [
  "/admin",
  "/client",
  "/freelancer",
  "/inbox",
  "/settings",
  "/workspace",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/inbox")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(token.role), request.url),
    );
  }

  if (pathname.startsWith("/client") && token.role !== "client") {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(token.role), request.url),
    );
  }

  if (pathname.startsWith("/freelancer") && token.role !== "freelancer") {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(token.role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/client/:path*",
    "/freelancer/:path*",
    "/admin/:path*",
    "/inbox",
    "/settings",
    "/workspace/:path*",
  ],
};
