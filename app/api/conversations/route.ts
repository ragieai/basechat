import assert from "assert";

import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { createConversationRequest } from "@/lib/api";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

export async function POST(request: NextRequest) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const json = await request.json();
  const { title, messages } = createConversationRequest.parse(json);

  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      tenantId: tenant.id,
      profileId: profile.id,
      title,
    })
    .returning();

  assert(conversation);

  // If continuing a conversation, add the initial messages
  if (messages?.length) {
    await db.insert(schema.messages).values(
      messages.map((message) => ({
        tenantId: tenant.id,
        conversationId: conversation.id,
        content: message.content,
        role: message.role,
        sources: [], // Initialize with empty sources for continued conversations
      })),
    );
  }

  return Response.json({ id: conversation.id });
}

export async function GET(request: NextRequest) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);

  const rs = await db
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
    );

  return Response.json(rs);
}
