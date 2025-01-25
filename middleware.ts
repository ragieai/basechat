import NextAuth from "next-auth";

import authConfig from "./auth.config";

// Wrapped middleware option. See https://authjs.dev/guides/edge-compatibility
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    if (
      req.nextUrl.pathname !== "/signin" &&
      req.nextUrl.pathname !== "/signup" &&
      req.nextUrl.pathname !== "/reset" &&
      !req.nextUrl.pathname.startsWith("/api/auth/callback") &&
      !req.nextUrl.pathname.startsWith("/healthz")
    ) {
      const newUrl = new URL("/signin", req.nextUrl.origin);
      if (req.nextUrl.pathname !== "/") {
        newUrl.searchParams.set("redirectTo", req.nextUrl.toString());
      }
      return Response.redirect(newUrl);
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
