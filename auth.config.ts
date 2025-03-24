import type { NextAuthConfig } from "next-auth";

export default {
  providers: [],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
} satisfies NextAuthConfig;
