import { z } from "zod";

import { LLMModel, LLMProvider, PROVIDER_MODELS, ALL_VALID_MODELS } from "@/lib/llm/types";

export const createConversationMessageResponseSchema = z.object({
  usedSourceIndexes: z.array(z.number().describe("The indexes of the sources used in the response")),
  message: z.string().describe("The response message"),
});

export const createConversationMessageRequestSchema = z.object({
  conversationId: z.string(),
  content: z.string().describe("The request message"),
  provider: z.enum(Object.keys(PROVIDER_MODELS) as [LLMProvider, ...LLMProvider[]]).default("openai"),
  model: z
    .string()
    .refine((model): model is LLMModel => {
      return ALL_VALID_MODELS.includes(model as LLMModel);
    }, "Invalid model")
    .default("gpt-4o"),
});

export type CreateConversationMessageRequest = z.infer<typeof createConversationMessageRequestSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.coerce.date(),
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
  question1: z.string(),
  question2: z.string(),
  question3: z.string(),
  groundingPrompt: z.string().nullable(),
  systemPrompt: z.string().nullable(),
});

export type MemberType = "profile" | "invite";
export type MemberRole = "admin" | "user";

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
    logoUrl: z.string().nullable(),
    profileId: z.string(),
  }),
);

export const updateCurrentProfileSchema = z.object({
  currentProfileId: z.string(),
});
