import assert from "assert";

import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAuthContext } from "@/lib/server/utils";

const createConversationRequest = z.object({
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

export async function POST(request: NextRequest) {
  const { profile, tenant } = await requireAuthContext();
  const json = await request.json();
  const { title, messages } = createConversationRequest.parse(json);

  // Create the conversation
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
  const { profile, tenant } = await requireAuthContext();

  const rs = await db
    .select({
      id: schema.conversations.id,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      updatedAt: schema.conversations.updatedAt,
    })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)))
    .orderBy(desc(schema.conversations.createdAt));

  return Response.json(rs);
}
