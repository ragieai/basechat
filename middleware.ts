import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

import { BASE_URL } from "./lib/server/settings";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const pathname = request.nextUrl.pathname;
    if (
      pathname !== "/sign-in" &&
      pathname !== "/sign-up" &&
      pathname !== "/reset" &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/check") &&
      !pathname.startsWith("/api/auth/callback") &&
      !pathname.startsWith("/healthz")
    ) {
      const redirectPath = getUnauthenticatedRedirectPath(pathname);
      const newUrl = new URL(redirectPath, BASE_URL);
      if (pathname !== "/") {
        newUrl.searchParams.set("redirectTo", request.nextUrl.toString());
      }
      return Response.redirect(newUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

function getUnauthenticatedRedirectPath(pathname: string) {
  if (pathname.startsWith("/o")) {
    const slug = pathname.split("/")[2];
    return `/check/${slug}`;
  } else if (pathname.startsWith("/share")) {
    const shareId = pathname.split("/")[2];
    return `/check-share/${shareId}`;
  } else {
    return "/sign-in";
  }
}
