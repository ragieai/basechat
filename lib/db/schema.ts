import { boolean, integer, json, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const timestampFields = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date().toISOString()),
};

const baseFields = {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  ...timestampFields,
};

const baseTenantFields = {
  ...baseFields,
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
};

export const connections = pgTable("connections", {
  ...baseTenantFields,
  ragieConnectionId: text("ragie_connection_id").notNull().unique(),
  name: text().notNull(),
  status: text().notNull(),
  sourceType: text().notNull(),
});

export const conversations = pgTable("conversations", {
  ...baseTenantFields,
  title: text().notNull(),
});

export const tenants = pgTable("tenants", {
  ...baseFields,
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  question1: text("question1"),
  question2: text("question2"),
  question3: text("question3"),
});

export const rolesEnum = pgEnum("roles", ["assistant", "system", "user"]);

export const messages = pgTable("messages", {
  ...baseTenantFields,
  content: text("content"),
  role: rolesEnum("role").notNull(),
  sources: json("sources").notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
});

/** Based on Auth.js example schema: https://authjs.dev/getting-started/adapters/drizzle */

export const users = pgTable("users", {
  ...baseFields,
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    ...baseFields,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ],
);

export const sessions = pgTable("sessions", {
  ...timestampFields,
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    ...baseFields,
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ],
);

export const authenticators = pgTable(
  "authenticators",
  {
    ...baseFields,
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ],
);
/** End Auth.js schema */
