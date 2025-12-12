import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import * as settings from "@/lib/server/settings";

import { linkUsers, sendResetPasswordEmail, sendVerificationEmail } from "./lib/server/service";
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
  advanced: { database: { generateId: false } },
  socialProviders,
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendVerificationEmail(user, url, token);
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: false, // TODO: change to true to block users from signing if email_verified is false
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
    jwt({
      jwt: {
        issuer: settings.BASE_URL,
        expirationTime: "30 days",
      },
    }),
    nextCookies(), // This must be the last plugin
  ],
});

export default auth;
