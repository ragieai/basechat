import NextAuth from "next-auth";

import authConfig from "./auth.config";
import { getFirstTenantByUserId } from "./lib/server/service";

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
      const newUrl = new URL("/sign-in", nextUrl.origin);
      if (nextUrl.pathname !== "/") {
        newUrl.searchParams.set("redirectTo", nextUrl.toString());
      }
      return Response.redirect(newUrl);
    }
    return;
  }

  // Get the tenant slug from the URL
  const pathSegments = nextUrl.pathname.split("/").filter(Boolean);
  const urlSlug = pathSegments[0];

  // Handle root path redirect
  // Need to check if the user has a tenant, the tenant has a slug, and the slug is the same as the urlSlug
  if (nextUrl.pathname === "/") {
    const tenant = await getFirstTenantByUserId(auth.user.id);
    if (!tenant?.slug) {
      return Response.redirect(new URL("/sign-in", nextUrl.origin));
    }
    return Response.redirect(new URL(`/${tenant.slug}`, nextUrl.origin));
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

  // Validate tenant access
  const tenant = await getFirstTenantByUserId(auth.user.id);
  if (!tenant?.slug || tenant.slug !== urlSlug) {
    return Response.redirect(new URL("/sign-in", nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
