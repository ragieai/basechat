import assert from "assert";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { CoreMessage, streamObject } from "ai";
import Handlebars from "handlebars";

import { createConversationMessageResponseSchema } from "@/lib/api";
import { DEFAULT_GROUNDING_PROMPT, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, getProviderForModel, LLMModel, SPECIAL_LLAMA_PROMPT } from "@/lib/llm/types";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { createConversationMessage, updateConversationMessageContent } from "@/lib/server/service";

type GenerateContext = {
  messages: CoreMessage[];
  sources: any[];
  model: LLMModel;
  isBreadth: boolean;
  rerankEnabled: boolean;
  prioritizeRecent: boolean;
};

export const FAILED_MESSAGE_CONTENT = `Failed to generate message from the model, please try again.`;

// Filter out messages with empty content
function filterEmptyMessages(messages: CoreMessage[]): CoreMessage[] {
  return messages.filter((msg) => {
    if (!msg.content) return false;
    if (typeof msg.content === "string" && msg.content.trim() === "") return false;
    return true;
  });
}

export async function generate(tenantId: string, profileId: string, conversationId: string, context: GenerateContext) {
  // get provider given the model
  let provider = getProviderForModel(context.model);
  if (!provider) {
    console.log(`Provider not found for model ${context.model}`);
    console.log(`Using default model: ${DEFAULT_MODEL} and default provider: ${DEFAULT_PROVIDER}`);
    provider = DEFAULT_PROVIDER;
    context.model = DEFAULT_MODEL;
  }

  const pendingMessage = await createConversationMessage({
    tenantId,
    conversationId,
    role: "assistant",
    content: null,
    sources: context.sources,
    model: context.model,
    isBreadth: context.isBreadth,
    rerankEnabled: context.rerankEnabled,
    prioritizeRecent: context.prioritizeRecent,
  });

  // Move system messages to the beginning for providers that require it
  const systemMessages = context.messages.filter((msg) => msg.role === "system");
  const nonSystemMessages = context.messages.filter((msg) => msg.role !== "system");

  // Filter out empty messages before sending to API
  context.messages = filterEmptyMessages(context.messages);

  let model;
  switch (provider) {
    case "openai":
      model = openai(context.model);
      break;
    case "google":
      model = google(context.model);
      // google requires system messages to be ONLY in the beginning
      context.messages = [...systemMessages, ...nonSystemMessages];
      break;
    case "anthropic":
      model = anthropic(context.model);
      // anthropic requires system messages to be ONLY in the beginning
      context.messages = [...systemMessages, ...nonSystemMessages];
      break;
    case "groq":
      model = groq(context.model);
      break;
    default:
      model = anthropic(DEFAULT_MODEL);
  }

  let result;
  try {
    result = await streamObject({
      messages: context.messages,
      model,
      temperature: 0.3,
      system: provider === "groq" ? SPECIAL_LLAMA_PROMPT : undefined,
      schema: createConversationMessageResponseSchema,
      onFinish: async (event) => {
        if (!event.object) {
          console.log("No object in event");
          await updateConversationMessageContent(
            tenantId,
            profileId,
            conversationId,
            pendingMessage.id,
            FAILED_MESSAGE_CONTENT,
          );
          return;
        }

        await updateConversationMessageContent(
          tenantId,
          profileId,
          conversationId,
          pendingMessage.id,
          event.object.message,
        );
      },
      onError: (error) => {
        console.error("Stream error:", error);
        // handle the error in the catch block instead
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    // Update message content with failure message
    await updateConversationMessageContent(
      tenantId,
      profileId,
      conversationId,
      pendingMessage.id,
      FAILED_MESSAGE_CONTENT,
    );
    // Instead of throwing, return a tuple with null result and the message ID
    return [null, pendingMessage.id] as const;
  }
  return [result, pendingMessage.id] as const;
}

export async function getRetrievalSystemPrompt(
  tenant: typeof schema.tenants.$inferSelect,
  query: string,
  isBreadth: boolean,
  rerankEnabled: boolean,
  prioritizeRecent: boolean,
) {
  const { client, partition } = await getRagieClientAndPartition(tenant.id);
  const topK = isBreadth || rerankEnabled ? 100 : 6;

  let response = await client.retrievals.retrieve({
    partition,
    query,
    topK,
    rerank: rerankEnabled,
    recencyBias: prioritizeRecent,
    ...(isBreadth ? { maxChunksPerDocument: 4 } : {}),
  });

  console.log(`ragie response includes ${response.scoredChunks.length} chunk(s)`);

  if (response.scoredChunks.length === 0 && rerankEnabled) {
    console.log("No chunks found, trying again with rerank disabled");

    response = await client.retrievals.retrieve({
      partition,
      query,
      topK: isBreadth ? 100 : 6,
      rerank: false,
      recencyBias: prioritizeRecent,
      ...(isBreadth ? { maxChunksPerDocument: 4 } : {}),
    });

    console.log(`ragie response (rereank fallback) includes ${response.scoredChunks.length} chunk(s)`);
  }

  const chunks = JSON.stringify(response);

  const sources = response.scoredChunks.map((chunk) => ({
    ...chunk.documentMetadata,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    streamUrl: chunk.links.self_audio_stream?.href,
    downloadUrl: chunk.links.self_audio_download?.href,
    startTime: chunk.metadata?.start_time,
    endTime: chunk.metadata?.end_time,
  }));

  const company = { name: tenant.name };
  return {
    content: renderSystemPrompt({ company, chunks }, tenant.systemPrompt),
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

export function renderGroundingSystemPrompt(context: GroundingSystemPromptContext, prompt?: string | null) {
  const groundingPrompt = prompt ? prompt : DEFAULT_GROUNDING_PROMPT;

  const template = Handlebars.compile(groundingPrompt);

  const now = new Date().toISOString();
  return template({ ...context, now });
}

function renderSystemPrompt(context: SystemPromptContext, template?: string | null) {
  const compiled = Handlebars.compile(template ?? DEFAULT_SYSTEM_PROMPT);

  return compiled({ ...context });
}
