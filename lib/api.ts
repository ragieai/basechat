import { z } from "zod";

import { modelSchema, modelArraySchema } from "@/lib/llm/types";

export const createConversationMessageResponseSchema = z.object({
  usedSourceIndexes: z.array(z.number().describe("The indexes of the sources used in the response")),
  message: z.string().describe("The response message"),
});

export const createConversationMessageRequestSchema = z.object({
  conversationId: z.string(),
  content: z.string().describe("The request message"),
  model: modelSchema.describe("The LLM model to use"),
  isBreadth: z.boolean().describe("Whether to use breadth-first search"),
  rerankEnabled: z.boolean().describe("Whether to rerank results"),
  prioritizeRecent: z.boolean().describe("Whether to prioritize recent data"),
});

export type CreateConversationMessageRequest = z.infer<typeof createConversationMessageRequestSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const conversationListResponseSchema = z.array(conversationSchema);

export const conversationMessagesResponseSchema = z.array(
  z.union([
    z.object({
      id: z.string(),
      content: z.string(),
      role: z.literal("assistant"),
      sources: z.array(z.any()).default([]),
      expanded: z.boolean().default(false),
      model: modelSchema,
    }),
    z.object({
      id: z.string(),
      content: z.string(),
      role: z.literal("user"),
    }),
    z.object({
      id: z.string(),
      content: z.string(),
      role: z.literal("system"),
    }),
  ]),
);

export const updateTenantSchema = z.object({
  question1: z.string().optional(),
  question2: z.string().optional(),
  question3: z.string().optional(),
  groundingPrompt: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  welcomeMessage: z.string().nullable().optional(),
  slug: z.string().optional(),
  isPublic: z.boolean().optional(),
  name: z.string().optional(),
  enabledModels: modelArraySchema.optional(),
});

export type MemberType = "profile" | "invite";
export type MemberRole = "admin" | "user" | "guest";

export interface Member {
  id: string;
  email: string | null;
  name: string | null;
  role: MemberRole;
  type: MemberType;
}

export const createTenantResponseSchema = z.object({
  id: z.string(),
});

export const tenantListResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable(),
    userCount: z.number().nullable(),
  }),
);

export const updateCurrentProfileSchema = z.object({
  tenantId: z.string(),
});

export const setupSchema = z.object({
  tenant: z.object({
    id: z.string(),
    slug: z.string(),
  }),
  profile: z.object({
    id: z.string(),
  }),
});

export interface SharedConversationResponse {
  conversation: {
    id: string;
    title: string;
  };
  messages: any[];
  isOwner: boolean;
  share: {
    accessType: AccessType;
    expiresAt?: string;
    createdAt: Date;
  };
}

export const createShareRequestSchema = z
  .object({
    tenantSlug: z.string(),
    accessType: z.enum(["public", "organization", "email"]).default("public"),
    recipientEmails: z.array(z.string().email()).optional(),
    expiresAt: z
      .string()
      .datetime()
      .optional()
      .refine((date) => !date || new Date(date) > new Date(), {
        message: "Expiration date must be in the future",
      }),
  })
  .refine((data) => data.accessType !== "email" || (data.recipientEmails && data.recipientEmails.length > 0), {
    message: "recipientEmails required when accessType is 'email'",
  });

export const createConversationRequest = z.object({
  title: z.string(),
  messages: z
    .array(
      z.object({
        content: z.string(),
        role: z.enum(["assistant", "system", "user"]),
      }),
    )
    .optional(),
});

export interface ShareSettings {
  accessType: AccessType;
  email?: string;
  expiresAt?: number;
  shareId?: string;
}

export const EXPIRES_AT_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
];

export const ACCESS_TYPES = [
  { label: "Public - Anyone with the link", value: "public" },
  { label: "Organization - Only members", value: "organization" },
  { label: "Email - Specific person", value: "email" },
] as const;

export type AccessType = (typeof ACCESS_TYPES)[number]["value"];
