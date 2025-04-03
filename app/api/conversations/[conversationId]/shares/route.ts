import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

// Get all shares for a conversation
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    // TODO: put tenant slug in headers when making this request tenant: slug
    const { profile, tenant } = await requireAuthContextFromRequest(request);
    const { conversationId } = await params;

    // Verify conversation ownership
    await getConversation(tenant.id, profile.id, conversationId);

    // Get all shares for this conversation
    const shares = await db
      .select({
        shareId: sharedConversations.shareId,
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
