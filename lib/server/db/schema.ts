import {
  AnyPgColumn,
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  title: text().notNull(),
});

export const tenants = pgTable("tenants", {
  ...baseFields,
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isPublic: boolean("is_public").notNull().default(false),
  question1: text("question1"),
  question2: text("question2"),
  question3: text("question3"),
  groundingPrompt: text("grounding_prompt"),
  systemPrompt: text("system_prompt"),
  logoFileName: text("logo_file_name"), // The name of the file that was uploaded
  logoObjectName: text("logo_object_name"), // The name of the object in the bucket
  logoUrl: text("logo_url"), // The publicly accessible URL of the object
});

export const rolesEnum = pgEnum("roles", ["admin", "user", "guest"]);

export const invites = pgTable(
  "invites",
  {
    ...baseTenantFields,
    invitedBy: uuid("invited_by_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    role: rolesEnum("role").notNull(),
  },
  (t) => ({
    unique_tenant_id_email: unique().on(t.tenantId, t.email),
  }),
);

export const profiles = pgTable(
  "profiles",
  {
    ...baseTenantFields,
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: rolesEnum("role").notNull(),
  },
  (t) => ({
    unique_tenant_id_user_id: unique().on(t.tenantId, t.userId),
  }),
);

export const messageRolesEnum = pgEnum("message_roles", ["assistant", "system", "user"]);

export const messages = pgTable("messages", {
  ...baseTenantFields,
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content"),
  role: messageRolesEnum("role").notNull(),
  sources: json("sources").notNull(),
});

/** Based on Auth.js example schema: https://authjs.dev/getting-started/adapters/drizzle */

export const users = pgTable("users", {
  ...baseFields,
  name: text("name"),
  email: text("email").unique(),
  password: text("password"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  currentProfileId: uuid("current_profile_id").references((): AnyPgColumn => profiles.id, { onDelete: "set null" }),
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
