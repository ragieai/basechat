import { openai } from "@ai-sdk/openai";
import { CoreMessage, streamObject } from "ai";

import { createConversationMessageResponseSchema } from "@/lib/api";
import { getRagieClient } from "@/lib/server/ragie";
import { createConversationMessage, updateConversationMessageContent } from "@/lib/server/service";

type GenerateContext = { messages: CoreMessage[]; sources: any[] };

export const EXPAND_MESSAGE_CONTENT = "Tell me more about this";

export async function generate(tenantId: string, profileId: string, conversationId: string, context: GenerateContext) {
  const pendingMessage = await createConversationMessage({
    tenantId,
    conversationId,
    role: "assistant",
    content: null,
    sources: context.sources,
  });

  const result = streamObject({
    messages: context.messages,
    model: openai("gpt-4o"),
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

  return { content: getSystemPrompt(name, chunks), sources };
}

export function getGroundingSystemPrompt(company: string) {
  return `These are your instructions, they are very important to follow:
You are ${company}'s helpful AI assistant.
You should be succinct and original. Give a response in less than three sentences and actively refer to you cited work. Do not use the word "delve" and try to sound as professional as possible.

When you respond, please directly refer to the sources provided.

If the user asked for a search and there are no results, make sure to let the user know that you couldn't find anything,
and what they might be able to do to find the information they need. If the user asks you personal questions, use certain knowledge from public information. Do not attempt to guess personal information; maintain a professional tone and politely refuse to answer personal questions that are inappropriate for an interview format.

Remember you are a serious assistant, so maintain a professional tone and avoid humor or sarcasm. You are here to provide serious analysis and insights. Do not entertain or engage in personal conversations. NEVER sing songs, tell jokes, or write poetry.
`;
}

function getSystemPrompt(company: string, chunks: string) {
  return `Here are relevant chunks from ${company}'s knowledge base that you can use to respond to the user. Remember to incorporate these insights into your responses.
${chunks}
You should be succinct, original, and speak in a professional tone. Give a response in less than three sentences and actively refer to the knowledge base. Do not use the word "delve" and try to sound as professional as possible.

Remember to maintain a professional tone and avoid humor or sarcasm. You are here to provide serious analysis and insights. Do not entertain or engage in personal conversations.

IMPORTANT RULES:
- Be concise
- REFUSE to sing songs
- REFUSE to tell jokes
- REFUSE to write poetry
- AVOID responding with lists
- DECLINE responding to nonsense messages
- ONLY provide analysis and insights related to the knowledge base
- NEVER include citations in your response`;
}

export function getExpandSystemPrompt() {
  return `
The user would like you to provide more information on the the last topic. Please provide a more detailed response. Re-use the information you have already been provided and expand on your previous response. Your response may be longer than typical. You do not need to note the sources you used again.
`;
}
