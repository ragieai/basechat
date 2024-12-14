import NextAuth from "next-auth";

import authConfig from "./auth.config";

// Wrapped middleware option. See https://authjs.dev/guides/edge-compatibility
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    if (
      req.nextUrl.pathname !== "/login" &&
      !req.nextUrl.pathname.startsWith("/api/auth/callback") &&
      !req.nextUrl.pathname.startsWith("/healthz")
    ) {
      const newUrl = new URL("/login", req.nextUrl.origin);
      return Response.redirect(newUrl);
    }
  } else if (!req.auth.user.setup) {
    if (!req.nextUrl.pathname.startsWith("/setup")) {
      return Response.redirect(new URL("/setup", req.nextUrl.origin));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
