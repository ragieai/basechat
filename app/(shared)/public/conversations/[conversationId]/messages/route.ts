import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { conversationMessagesResponseSchema } from "@/lib/api";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;

    // query directly in the route handler
    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(asc(schema.messages.createdAt));

    const parsedMessages = conversationMessagesResponseSchema.parse(messages);
    return Response.json(parsedMessages);
  } catch (error) {
    console.error("Error fetching public conversation messages:", error);

    return NextResponse.json({ error: "Failed to load conversation messages." }, { status: 500 });
  }
}
