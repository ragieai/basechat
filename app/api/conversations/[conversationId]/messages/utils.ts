import { openai } from "@ai-sdk/openai";
import { CoreMessage, streamObject } from "ai";
import Handlebars from "handlebars";

import { createConversationMessageResponseSchema } from "@/lib/api";
import { DEFAULT_GROUNDING_PROMPT, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { getProvider } from "@/lib/llm/providers/factory";
import { LLMModel, DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/llm/types";
import { getRagieClient } from "@/lib/server/ragie";
import { createConversationMessage, updateConversationMessageContent } from "@/lib/server/service";

type GenerateContext = { messages: CoreMessage[]; sources: any[]; model: LLMModel };

export async function generate(
  tenantId: string,
  profileId: string,
  conversationId: string,
  context: GenerateContext,
  model: LLMModel = DEFAULT_MODEL,
) {
  const pendingMessage = await createConversationMessage({
    tenantId,
    conversationId,
    role: "assistant",
    content: null,
    sources: context.sources,
    model,
    provider: DEFAULT_PROVIDER,
  });

  const provider = getProvider(model);
  const result = await provider.generateStream(context.messages, {
    model,
    temperature: 0.3,
    schema: createConversationMessageResponseSchema,
    onFinish: async (event) => {
      if (!event.object) return;
      await updateConversationMessageContent(
        tenantId,
        profileId,
        conversationId,
        pendingMessage.id,
        event.object.message,
        model,
      );
    },
  });

  return [result, pendingMessage.id] as const;
}

export async function getRetrievalSystemPrompt(tenantId: string, name: string, query: string) {
  const response = await getRagieClient().retrievals.retrieve({
    partition: tenantId,
    query,
    topK: 6,
    rerank: true,
  });

  console.log(`ragie response includes ${response.scoredChunks.length} chunk(s)`);

  const chunks = JSON.stringify(response);

  const sources = response.scoredChunks.map((chunk) => ({
    ...chunk.documentMetadata,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
  }));

  return {
    content: getSystemPrompt({
      company: { name },
      chunks,
    }),
    sources,
  };
}

export type GroundingSystemPromptContext = {
  company: {
    name: string;
  };
};

export type SystemPromptContext = {
  company: {
    name: string;
  };
  chunks: string;
};

export function getGroundingSystemPrompt(context: GroundingSystemPromptContext, prompt?: string | null) {
  const groundingPrompt = prompt ? prompt : DEFAULT_GROUNDING_PROMPT;

  const template = Handlebars.compile(groundingPrompt);

  const now = new Date().toISOString();
  return template({ ...context, now });
}

function getSystemPrompt(context: SystemPromptContext, prompt?: string | null) {
  const systemPrompt = prompt ? prompt : DEFAULT_SYSTEM_PROMPT;

  const template = Handlebars.compile(systemPrompt);

  return template({ ...context });
}
