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
  isBreadth: z.boolean().describe("Whether to use breadth mode for retrieval"),
  rerankEnabled: z.boolean().describe("Whether to enable reranking of retrieved documents"),
  prioritizeRecent: z.boolean().describe("Whether to enable recency bias in retrieval"),
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
  defaultModel: modelSchema.optional(),
  isBreadth: z.boolean().optional(),
  rerankEnabled: z.boolean().optional(),
  prioritizeRecent: z.boolean().optional(),
  overrideBreadth: z.boolean().optional(),
  overrideRerank: z.boolean().optional(),
  overridePrioritizeRecent: z.boolean().optional(),
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
    profileId: z.string().nullable(),
    profileRole: z.enum(["admin", "user", "guest"]).nullable(),
    lastAdmin: z.boolean(),
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
