import NextAuth from "next-auth";

import authConfig from "./auth.config";

// Wrapped middleware option. See https://authjs.dev/guides/edge-compatibility
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { auth, nextUrl } = req;

  // Handle authentication first
  if (!auth) {
    if (
      nextUrl.pathname !== "/sign-in" &&
      nextUrl.pathname !== "/sign-up" &&
      nextUrl.pathname !== "/reset" &&
      nextUrl.pathname !== "/change-password" &&
      !nextUrl.pathname.startsWith("/api/auth/callback") &&
      !nextUrl.pathname.startsWith("/healthz")
    ) {
      const newUrl = new URL("/sign-in", req.nextUrl.origin);
      if (req.nextUrl.pathname !== "/") {
        newUrl.searchParams.set("redirectTo", req.nextUrl.toString());
      }
      return Response.redirect(newUrl);
    }
    return;
  }

  // Skip tenant validation for non-tenant routes
  if (
    nextUrl.pathname.startsWith("/api") ||
    nextUrl.pathname.startsWith("/sign-in") ||
    nextUrl.pathname.startsWith("/sign-up") ||
    nextUrl.pathname.startsWith("/reset") ||
    nextUrl.pathname.startsWith("/change-password") ||
    nextUrl.pathname.startsWith("/healthz")
  ) {
    return;
  }

  // Get the tenant slug from the URL
  const pathSegments = nextUrl.pathname.split("/").filter(Boolean);
  const urlSlug = pathSegments[0];

  // If no tenant slug in URL, redirect to user's tenant
  if (!urlSlug) {
    if (!auth.user.tenantSlug) {
      // in theory never happens, always has a tenant slug
      return Response.redirect(new URL("/sign-in", nextUrl));
    }
    return Response.redirect(new URL(`/${auth.user.tenantSlug}`, nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
