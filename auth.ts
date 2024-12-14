import assert from "assert";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import assertNever from "assert-never";
import { eq } from "drizzle-orm";
import NextAuth, { DefaultSession } from "next-auth";

import authConfig from "./auth.config";
import db from "./lib/db";
import * as schema from "./lib/db/schema";
import { isSetupComplete } from "./lib/service";

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** User ID should always exist on the session */
      id: string;

      /** Flag indiciating whether or not the user has finished setup */
      setup: boolean;
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
    async jwt({ token, user, trigger, session: sessionUpdates }) {
      switch (trigger) {
        case "signIn":
        case "signUp":
          if (user) {
            assert(user.id, "expected AdapterUser");
            token.id = user.id;
            token.setup = await isSetupComplete(user.id);
          }
          break;
        case "update":
          if ("setup" in sessionUpdates) {
            // FIXME: Validate setup against the database
            token.setup = !!sessionUpdates.setup;
          }
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
