import NextAuth from "next-auth";

import authConfig from "./auth.config";
import { requireAuthContextFromRequest } from "./lib/server/utils";

// Wrapped middleware option. See https://authjs.dev/guides/edge-compatibility
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const pathname = req.nextUrl.pathname;
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
      console.log({ redirectPath });
      const newUrl = new URL(redirectPath, req.nextUrl.origin);
      if (pathname !== "/") {
        newUrl.searchParams.set("redirectTo", req.nextUrl.toString());
      }
      return Response.redirect(newUrl);
    }
  }
});

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
