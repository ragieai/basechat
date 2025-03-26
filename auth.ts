import assert from "assert";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import assertNever from "assert-never";
import NextAuth, { DefaultSession, User } from "next-auth";
import { CredentialsConfig } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import authConfig from "./auth.config";
import db from "./lib/server/db";
import * as schema from "./lib/server/db/schema";
import { findUserByEmail, findUserById } from "./lib/server/service";
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

interface AnonymousConfig extends CredentialsConfig {
  type: "credentials";
  authorize: (credentials: Partial<{ id: unknown }>, request: Request) => Promise<User | null>;
}

export default function Anonymous(config: Partial<AnonymousConfig>): AnonymousConfig {
  return {
    id: "anonymous",
    name: "Anonymous",
    type: "credentials",
    authorize: () => Promise.resolve(null),
    // @ts-expect-error
    options: config,
  };
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
    Anonymous({
      authorize: async (credentials: Partial<{ id: unknown }>, request: Request) => {
        if (!credentials.id) {
          throw new Error("Invalid credentials.");
        }
        const user = await findUserById(credentials.id as string);
        if (!user?.isAnonymous) {
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
    async signIn({ user }) {
      // Ensure the user is signed out before signing in
      // This fixes an issue where the user goes from being anonymous to creating an account
      await signOut({ redirect: false });
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      switch (trigger) {
        case "signIn":
        case "signUp":
          if (user) {
            assert(user.id, "expected AdapterUser");
            token.id = user.id;
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
