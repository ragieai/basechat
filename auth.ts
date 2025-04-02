import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import * as settings from "@/lib/server/settings";

import { linkUsers, sendResetPasswordEmail } from "./lib/server/service";
import { hashPassword, verifyPassword } from "./lib/server/utils";

const socialProviders: Record<string, unknown> = {};

if (settings.AUTH_GOOGLE_ID && settings.AUTH_GOOGLE_SECRET) {
  socialProviders.google = {
    clientId: settings.AUTH_GOOGLE_ID,
    clientSecret: settings.AUTH_GOOGLE_SECRET,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  advanced: { generateId: false },
  socialProviders,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    sendResetPassword: ({ user, url, token }) => sendResetPasswordEmail(user, url, token),
    resetPasswordTokenExpiresIn: 36000, // seconds
    password: {
      hash: (password) => hashPassword(password),
      verify: ({ hash, password }) => verifyPassword(hash, password),
    },
  },
  plugins: [
    anonymous({
      emailDomainName: "example.com",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await linkUsers(anonymousUser.user.id, newUser.user.id);
      },
    }),
    nextCookies(), // This must be the last plugin
  ],
});

export default auth;
