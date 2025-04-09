import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { createShareRequestSchema } from "@/lib/api";
import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext, requireAuthContextFromRequest } from "@/lib/server/utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;

    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const validationResult = createShareRequestSchema.safeParse(body);
    if (!validationResult.success) return new NextResponse("Invalid request body", { status: 400 });

    const { slug } = validationResult.data;
    const { profile, tenant } = await requireAuthContext(slug);

    // Verify conversation ownership
    const conversation = await getConversation(tenant.id, profile.id, conversationId);
    // Create share record
    const [share] = await db
      .insert(sharedConversations)
      .values({
        conversationId: conversation.id,
        tenantId: tenant.id,
        createdBy: profile.id,
        accessType: body.accessType,
        recipientEmails: body.recipientEmails || [],
        expiresAt: body.expiresAt,
      })
      .returning();

    return Response.json({ shareId: share.id });
  } catch (error) {
    console.error("Failed to create share:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Get all shares for a conversation
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { profile, tenant } = await requireAuthContextFromRequest(request);
    const { conversationId } = await params;

    // Verify conversation ownership
    await getConversation(tenant.id, profile.id, conversationId);

    // Get all shares for this conversation
    const shares = await db
      .select({
        shareId: sharedConversations.id,
        accessType: sharedConversations.accessType,
        createdAt: sharedConversations.createdAt,
        expiresAt: sharedConversations.expiresAt,
        recipientEmails: sharedConversations.recipientEmails,
      })
      .from(sharedConversations)
      .where(eq(sharedConversations.conversationId, conversationId))
      .orderBy(sharedConversations.createdAt);

    return Response.json(shares);
  } catch (error) {
    console.error("Error fetching shares:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
