import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { sharedConversationResponseSchema } from "@/lib/api";
import db from "@/lib/server/db";
import { conversations, messages, sharedConversations, tenants } from "@/lib/server/db/schema";
import { requireSession } from "@/lib/server/utils";

// Get information about a share
export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const session = await requireSession();

    // Get share record with conversation and tenant
    const [share] = await db
      .select({
        share: sharedConversations,
        conversation: conversations,
        tenant: tenants,
      })
      .from(sharedConversations)
      .leftJoin(conversations, eq(conversations.id, sharedConversations.conversationId))
      .leftJoin(tenants, eq(tenants.id, conversations.tenantId))
      .where(eq(sharedConversations.shareId, shareId))
      .limit(1);

    if (!share || !share.conversation || !share.tenant) {
      return new Response("Share not found", { status: 404 });
    }

    // Get conversation messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, share.conversation.id))
      .orderBy(messages.createdAt);

    const responseData = {
      share: {
        shareId: share.share.shareId,
        accessType: share.share.accessType,
        expiresAt: share.share.expiresAt,
        recipientEmails: share.share.recipientEmails,
        createdBy: share.share.createdBy,
      },
      conversation: share.conversation,
      messages: conversationMessages,
      tenant: {
        id: share.tenant.id,
        slug: share.tenant.slug,
      },
      isOwner: session?.user.id === share.share.createdBy,
    };

    return Response.json(responseData);
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
