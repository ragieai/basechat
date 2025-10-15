import assert from "assert";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod/v3";

import { NAMING_SYSTEM_PROMPT } from "@/lib/constants";
import { DEFAULT_NAMING_MODEL } from "@/lib/llm/types";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

const createConversationRequest = z.object({
  content: z.string(),
});

const getConversationsRequest = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export async function POST(request: NextRequest) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const json = await request.json();
  const { content } = createConversationRequest.parse(json);
  const title = await createConversationTitle(content);

  const rs = await db
    .insert(schema.conversations)
    .values({
      tenantId: tenant.id,
      profileId: profile.id,
      title,
    })
    .returning();

  assert(rs.length === 1);
  return Response.json({ id: rs[0].id });
}

export async function GET(request: NextRequest) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);

  // Parse query parameters
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  const { page: validatedPage, limit: validatedLimit } = getConversationsRequest.parse({
    page,
    limit,
  });

  // Calculate offset
  const offset = (validatedPage - 1) * validatedLimit;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)));

  // Get paginated conversations
  const conversations = await db
    .select({
      id: schema.conversations.id,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      updatedAt: schema.conversations.updatedAt,
    })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)))
    .orderBy(
      desc(
        sql`CASE WHEN ${schema.conversations.updatedAt} IS NOT NULL THEN ${schema.conversations.updatedAt} ELSE ${schema.conversations.createdAt} END`,
      ),
    )
    .limit(validatedLimit)
    .offset(offset);

  return Response.json({
    items: conversations,
    total: count,
    page: validatedPage,
    totalPages: Math.ceil(count / validatedLimit),
  });
}

/*
params: content: string
returns: string - appropriate name for this conversation
*/
async function createConversationTitle(content: string) {
  const model = openai(DEFAULT_NAMING_MODEL);
  const systemPrompt = NAMING_SYSTEM_PROMPT;
  const userPrompt = `
  Here is the initial message from the user:
  ${content}
  Please generate a title for this conversation.
  `;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });
  return text;
}
