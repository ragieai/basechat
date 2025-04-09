import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { conversationMessagesResponseSchema } from "@/lib/api";
// Import necessary drizzle functions and schema/db
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const body = await request.json();
    const { tenantId } = body;

    const { conversationId } = await params;

    // Perform the query directly in the route handler
    const messages = await db
      .select()
      .from(schema.messages)
      .where(and(eq(schema.messages.tenantId, tenantId), eq(schema.messages.conversationId, conversationId)))
      .orderBy(asc(schema.messages.createdAt));

    // Validate the data structure before sending
    const parsedMessages = conversationMessagesResponseSchema.parse(messages);
    console.log(parsedMessages);
    return Response.json(parsedMessages);
  } catch (error) {
    console.error("Error fetching public conversation messages:", error);

    // Handle Zod validation errors specifically for better client feedback
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid data format received from service.", details: error.errors },
        { status: 500 },
      );
    }

    // Handle generic errors
    return NextResponse.json({ error: "Failed to load conversation messages." }, { status: 500 });
  }
}
