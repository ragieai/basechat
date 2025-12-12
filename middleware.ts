import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

import { BASE_URL } from "./lib/server/settings";

/**
 * Check if the path is an embed route (e.g., /o/[slug]/embed)
 */
function isEmbedRoute(pathname: string): boolean {
  const embedPattern = /^\/o\/[^/]+\/embed(\/|$)/;
  return embedPattern.test(pathname);
}

export async function middleware(request: NextRequest) {
  console.log("===>>middleware", request.nextUrl.pathname);
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  // Allow embed routes without authentication - they handle auth via JWT
  if (isEmbedRoute(pathname)) {
    console.log("===>>isEmbedRoute", pathname);
    const requestHeaders = new Headers(request.headers);
    // requestHeaders.set("x-pathname", pathname);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Allow embedding in iframes from any origin for embed routes
    // Security is handled via JWT token validation
    response.headers.set("X-Frame-Options", "ALLOWALL");
    // TODO: Double check that we want to completely remove the Content-Security-Policy header
    response.headers.delete("Content-Security-Policy");

    return response;
  }

  if (!sessionCookie) {
    if (
      pathname !== "/sign-in" &&
      pathname !== "/sign-up" &&
      pathname !== "/reset" &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/check") &&
      !pathname.startsWith("/api/auth/callback") &&
      !pathname.startsWith("/healthz") &&
      !pathname.startsWith("/images")
    ) {
      const redirectPath = getUnauthenticatedRedirectPath(pathname);
      const newUrl = new URL(redirectPath, BASE_URL);
      if (pathname !== "/") {
        const redirectTo = new URL(pathname, BASE_URL);
        redirectTo.search = request.nextUrl.search;
        newUrl.searchParams.set("redirectTo", redirectTo.toString());
      }
      console.log("===>>redirecting to", pathname, "->", newUrl);
      return Response.redirect(newUrl);
    }
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

function getUnauthenticatedRedirectPath(pathname: string) {
  if (pathname.startsWith("/o")) {
    const slug = pathname.split("/")[2];
    return `/check/${slug}`;
  } else {
    return "/sign-in";
  }
}
