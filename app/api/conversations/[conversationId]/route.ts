import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v3";

import db from "@/lib/server/db";
import { conversations } from "@/lib/server/db/schema";
import { requireAuthContext } from "@/lib/server/utils";

// Schema for validating request body
const deleteConversationSchema = z.object({
  tenantSlug: z.string(),
});

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  try {
    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const validationResult = deleteConversationSchema.safeParse(body);
    if (!validationResult.success) return new NextResponse("Invalid request body", { status: 400 });

    const { tenantSlug } = validationResult.data;

    const { profile, tenant } = await requireAuthContext(tenantSlug);

    const deleteResults = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.tenantId, tenant.id),
          eq(conversations.profileId, profile.id),
        ),
      )
      .returning({ id: conversations.id });

    // Check if we actually deleted anything
    if (deleteResults.length === 0) {
      return new NextResponse("Conversation not found or not authorized", { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
