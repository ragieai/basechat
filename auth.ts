import assert from "assert";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import assertNever from "assert-never";
import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import authConfig from "./auth.config";
import db from "./lib/server/db";
import * as schema from "./lib/server/db/schema";
import { findUserByEmail, getFirstTenantByUserId } from "./lib/server/service";
import { verifyPassword } from "./lib/server/utils";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** User ID should always exist on the session */
      id: string;

      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials: Partial<{ email: unknown; password: unknown }>) => {
        const user = await findUserByEmail(credentials.email as string);
        if (!user) {
          throw new Error("Invalid credentials.");
        }
        if (!user.password) {
          throw new Error("Invalid credentials.");
        }
        const isValid = await verifyPassword(user.password, credentials.password as string);
        if (!isValid) {
          throw new Error("Invalid credentials.");
        }
        return user;
      },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    authorized: ({ auth }) => !!auth,
    async jwt({ token, user, trigger, session }) {
      switch (trigger) {
        case "signIn":
        case "signUp":
          if (user) {
            assert(user.id, "expected AdapterUser");
            token.id = user.id;
            const tenant = await getFirstTenantByUserId(user.id);
            token.tenantId = tenant ? tenant.id : null;
          }
          break;
        case "update":
          break;
        case undefined:
          break;
        default:
          assertNever(trigger);
      }
      return token;
    },
  },
});
