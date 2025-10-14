import {
  AnyPgColumn,
  boolean,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { stepResultSchema, finalAnswerSchema } from "@/components/agentic-retriever/types";
import { DEFAULT_MODEL, modelSchema, modelArraySchema } from "@/lib/llm/types";

const timestampFields = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
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
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" }),
  addedBy: text(),
});

export const conversations = pgTable(
  "conversations",
  {
    ...baseTenantFields,
    profileId: uuid("profile_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    title: text().notNull(),
    slackThreadId: text("slack_thread_id"),
    slackEvent: json("slack_event"),
  },
  (t) => ({
    profileIdx: index("conversations_profile_idx").on(t.profileId),
    tenantProfileIdx: index("conversations_tenant_profile_idx").on(t.tenantId, t.profileId),
  }),
);

export const paidStatusEnum = pgEnum("paid_status", ["trial", "active", "expired", "legacy"]);

export const agenticLevelEnum = pgEnum("agentic_level", ["low", "medium", "high", "disabled"]);

export const tenants = pgTable(
  "tenants",
  {
    ...baseFields,
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    isPublic: boolean("is_public").notNull().default(false),
    question1: text("question1"),
    question2: text("question2"),
    question3: text("question3"),
    groundingPrompt: text("grounding_prompt"),
    systemPrompt: text("system_prompt"),
    welcomeMessage: text("welcome_message"),
    logoFileName: text("logo_file_name"), // The name of the file that was uploaded
    logoObjectName: text("logo_object_name"), // The name of the object in the bucket
    logoUrl: text("logo_url"), // The publicly accessible URL of the object
    disabledModels: text("disabled_models").array().default([]).$type<z.infer<typeof modelArraySchema>>(),
    defaultModel: text("default_model").default(DEFAULT_MODEL).$type<z.infer<typeof modelSchema>>(),
    isBreadth: boolean("is_breadth").default(false),
    rerankEnabled: boolean("rerank_enabled").default(false),
    prioritizeRecent: boolean("prioritize_recent").default(false),
    overrideBreadth: boolean("override_breadth").default(true),
    overrideRerank: boolean("override_rerank").default(true),
    overridePrioritizeRecent: boolean("override_prioritize_recent").default(true),
    overrideAgenticLevel: boolean("override_agentic_level").default(true),
    agenticLevel: agenticLevelEnum("agentic_level").default("medium"),
    ragieApiKey: text("ragie_api_key"),
    ragiePartition: text("ragie_partition"),
    slackEnabled: boolean("slack_enabled").default(false),
    slackChannels: text("slack_channels").array().default([]),
    slackBotToken: text("slack_bot_token"),
    slackTeamId: text("slack_team_id").unique(),
    slackTeamName: text("slack_team_name"),
    slackResponseMode: text("slack_response_mode").default("mentions").$type<"mentions" | "all">(),
    metadata: jsonb("metadata").default({}).$type<{
      orbSubscriptionId?: string;
      orbCustomerId?: string;
      stripeCustomerId?: string;
      plans?: Array<{
        id: string; // orb subscription id
        name: string; // orb plan type "developer" "starter" "pro" "proAnnual"
        endedAt: Date | null;
        startedAt: Date;
        tier: string; // orb plan id
        seats: number;
      }>;
    }>(),
    trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true, mode: "date" }).notNull(),
    paidStatus: paidStatusEnum("paid_status").default("trial").notNull(),
    partitionLimitExceededAt: timestamp("partition_limit_exceeded_at", { withTimezone: true, mode: "date" }),
  },
  (t) => ({
    paidStatusIdx: index("tenants_paid_status_idx").on(t.paidStatus),
  }),
);

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
    roleIdx: index("profiles_role_idx").on(t.role),
  }),
);

export const messageRolesEnum = pgEnum("message_roles", ["assistant", "system", "user"]);

export const messageRetrievalTypesEnum = pgEnum("message_retrieval_types", ["agentic", "standard"]);

export const messages = pgTable(
  "messages",
  {
    ...baseTenantFields,
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content"),
    role: messageRolesEnum("role").notNull(),
    sources: json("sources").notNull(),
    slackEvent: json("slack_event"),
    model: text("model").notNull().default(DEFAULT_MODEL).$type<z.infer<typeof modelSchema>>(),
    isBreadth: boolean("is_breadth").notNull().default(false),
    rerankEnabled: boolean("rerank_enabled").notNull().default(false),
    prioritizeRecent: boolean("prioritize_recent").notNull().default(false),
    type: messageRetrievalTypesEnum("type").notNull().default("standard"),
    agenticInfo: jsonb("agentic_info").default({}).$type<{
      runId: string;
      timestamp: string;
      stepTiming: Array<number>;
      steps: Array<z.infer<typeof stepResultSchema>>;
      query: string;
      result: z.infer<typeof finalAnswerSchema> | null;
      effort: string;
    }>(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
    tenantConversationIdx: index("messages_tenant_conversation_idx").on(t.tenantId, t.conversationId),
  }),
);

/** Based on Auth.js example schema: https://authjs.dev/getting-started/adapters/drizzle */

export const users = pgTable("users", {
  ...baseFields,
  name: text("name"),
  email: text("email").unique(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  slackUserId: text("slack_user_id").unique(),
  slackUser: json("slack_user"),
  image: text("image"),
  currentProfileId: uuid("current_profile_id").references((): AnyPgColumn => profiles.id, { onDelete: "set null" }),
  completedWelcomeFlowAt: timestamp("completed_welcome_flow_at", { withTimezone: true, mode: "date" }),
});

export const accounts = pgTable(
  "accounts",
  {
    ...baseFields,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.providerId, account.accountId],
      }),
    },
  ],
);

export const sessions = pgTable("sessions", {
  ...baseFields,
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const verifications = pgTable("verifications", {
  ...baseFields,
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

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

export const oauthApplications = pgTable(
  "oauth_applications",
  {
    ...timestampFields, // define id here as not a primary key, must use composite
    id: uuid("id").notNull().defaultRandom(),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"), // Optional for public clients using PKCE
    name: text("name").notNull(), // Name of the OAuth client
    redirectURLs: text("redirect_urls"), // Comma-separated list of redirect URLs
    metadata: text("metadata"), // Additional metadata for the OAuth client
    type: text("type").notNull(), // Type of OAuth client (e.g., web, mobile)
    disabled: boolean("disabled").notNull().default(false), // Indicates if the client is disabled
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // ID of the user who owns the client (optional)
  },
  (t) => ({
    compositePK: primaryKey({
      columns: [t.id, t.clientId],
    }),
  }),
);

export const oauthAccessTokens = pgTable("oauth_access_tokens", {
  ...baseFields,
  accessToken: text("access_token").notNull(), // Access token issued to the client
  refreshToken: text("refresh_token"), // Refresh token issued to the client
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }).notNull(), // Expiration date of the access token
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }), // Expiration date of the refresh token
  clientId: text("client_id")
    .references(() => oauthApplications.clientId, { onDelete: "cascade" })
    .notNull(), // ID of the OAuth client
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // ID of the user associated with the token
  scopes: text("scopes"), // Comma-separated list of scopes granted
});

export const oauthConsents = pgTable("oauth_consents", {
  ...baseFields,
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // ID of the user who gave consent
  clientId: text("client_id")
    .references(() => oauthApplications.clientId, { onDelete: "cascade" })
    .notNull(), // ID of the OAuth client
  scopes: text("scopes"), // Comma-separated list of scopes granted
  consentGiven: boolean("consent_given").notNull().default(false), // Indicates if the user has given consent
});
