import { CoreMessage } from "ai";
import assertNever from "assert-never";
import { NextRequest } from "next/server";

import { conversationMessagesResponseSchema, createConversationMessageRequestSchema } from "@/lib/api";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, getProviderForModel } from "@/lib/llm/types";
import { createConversationMessage, getConversation, getConversationMessages } from "@/lib/server/service";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

import { generate, renderGroundingSystemPrompt, getRetrievalSystemPrompt, FAILED_MESSAGE_CONTENT } from "./utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const { conversationId } = await params;
  const messages = await getConversationMessages(tenant.id, profile.id, conversationId);

  return Response.json(conversationMessagesResponseSchema.parse(messages));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const { conversationId } = await params;
  const json = await request.json();

  const {
    content,
    model: modelInJson,
    isBreadth,
    rerankEnabled,
    prioritizeRecent,
  } = createConversationMessageRequestSchema.parse(json);

  let provider = getProviderForModel(modelInJson);
  let model = modelInJson;
  if (!provider || !tenant.enabledModels.includes(modelInJson)) {
    console.log(`Invalid model or model not enabled for tenant: ${model}`);
    console.log(`Using default model: ${DEFAULT_MODEL} and default provider: ${DEFAULT_PROVIDER}`);
    provider = DEFAULT_PROVIDER;
    model = DEFAULT_MODEL;
  }

  const conversation = await getConversation(tenant.id, profile.id, conversationId);
  const existing = await getConversationMessages(tenant.id, profile.id, conversation.id);

  if (!existing.length) {
    await createConversationMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "system",
      content: renderGroundingSystemPrompt(
        {
          company: {
            name: tenant.name,
          },
        },
        tenant.groundingPrompt,
      ),
      sources: [],
      model: model,
    });
  }

  await createConversationMessage({
    tenantId: tenant.id,
    conversationId: conversation.id,
    role: "user",
    content,
    sources: [],
    model: model,
  });

  let sources: { documentId: string; documentName: string; streamUrl?: string; downloadUrl?: string }[] = [];

  const { content: systemMessageContent, sources: ragSources } = await getRetrievalSystemPrompt(
    tenant,
    content,
    isBreadth,
    rerankEnabled,
    prioritizeRecent,
  );

  sources = ragSources;

  await createConversationMessage({
    tenantId: tenant.id,
    conversationId: conversation.id,
    role: "system",
    content: systemMessageContent,
    sources: [],
    model: model,
  });

  const all = await getConversationMessages(tenant.id, profile.id, conversation.id);
  const messages: CoreMessage[] = all.map(({ role, content }) => {
    switch (role) {
      case "assistant":
        return { role: "assistant" as const, content: content ?? "" };
      case "user":
        return { role: "user" as const, content: content ?? "" };
      case "system":
        return { role: "system" as const, content: content ?? "" };
      default:
        assertNever(role);
    }
  });

  const [stream, messageId] = await generate(tenant.id, profile.id, conversation.id, {
    messages,
    sources,
    model,
    isBreadth,
    rerankEnabled,
    prioritizeRecent,
  });
  if (!stream) {
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify({ usedSourceIndexes: [], message: FAILED_MESSAGE_CONTENT })),
          );
          controller.close();
        },
      }),
      {
        headers: {
          "x-message-id": messageId,
          "x-model": model,
        },
      },
    );
  }
  return stream.toTextStreamResponse({ headers: { "x-message-id": messageId, "x-model": model } });
}
