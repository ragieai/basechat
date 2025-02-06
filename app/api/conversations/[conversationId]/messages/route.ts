import { CoreMessage } from "ai";
import assertNever from "assert-never";
import { NextRequest } from "next/server";

import { conversationMessagesResponseSchema, createConversationMessageRequestSchema } from "@/lib/schema";
import { requireAuthContext } from "@/lib/server/server-utils";
import { createConversationMessage, getConversation, getConversationMessages } from "@/lib/server/service";

import {
  EXPAND_MESSAGE_CONTENT,
  generate,
  getExpandSystemPrompt,
  getGroundingSystemPrompt,
  getRetrievalSystemPrompt,
} from "./utils";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContext();
  const { conversationId } = await params;
  const messages = await getConversationMessages(tenant.id, profile.id, conversationId);

  return Response.json(conversationMessagesResponseSchema.parse(messages));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContext();
  const { conversationId } = await params;
  const json = await request.json();

  const { content } = createConversationMessageRequestSchema.parse(json);

  const conversation = await getConversation(tenant.id, profile.id, conversationId);
  const existing = await getConversationMessages(tenant.id, profile.id, conversation.id);

  if (!existing.length) {
    await createConversationMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "system",
      content: getGroundingSystemPrompt(tenant.name),
      sources: [],
    });
  }

  await createConversationMessage({
    tenantId: tenant.id,
    conversationId: conversation.id,
    role: "user",
    content,
    sources: [],
  });

  let sources: { documentId: string; documentName: string }[] = [];

  if (content !== EXPAND_MESSAGE_CONTENT) {
    const { content: systemMessageContent, sources: ragSources } = await getRetrievalSystemPrompt(
      tenant.id,
      tenant.name,
      content,
    );

    sources = ragSources;

    await createConversationMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "system",
      content: systemMessageContent,
      sources: [],
    });
  } else {
    await createConversationMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "system",
      content: getExpandSystemPrompt(),
      sources: [],
    });
  }

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

  const [stream, messageId] = await generate(tenant.id, profile.id, conversation.id, { messages, sources });
  return stream.toTextStreamResponse({ headers: { "x-message-id": messageId } });
}
