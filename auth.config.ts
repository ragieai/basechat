import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export default {
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.id;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      return session;
    },
  },
} satisfies NextAuthConfig;
