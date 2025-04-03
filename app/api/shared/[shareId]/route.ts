import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { sharedConversationResponseSchema } from "@/lib/api";
import db from "@/lib/server/db";
import { conversations, messages, sharedConversations } from "@/lib/server/db/schema";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

// Get a shared conversation
export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const { profile, tenant } = await requireAuthContextFromRequest(request);

    // Get share record with conversation
    const [share] = await db
      .select({
        share: sharedConversations,
        conversation: conversations,
      })
      .from(sharedConversations)
      .leftJoin(conversations, eq(conversations.id, sharedConversations.conversationId))
      .where(eq(sharedConversations.shareId, shareId))
      .limit(1);

    if (!share || !share.conversation) {
      return new Response("Share not found", { status: 404 });
    }

    // Check access permissions
    if (share.share.expiresAt && new Date(share.share.expiresAt) < new Date()) {
      return new Response("Share link has expired", { status: 403 });
    }

    if (share.share.accessType === "organization") {
      if (share.share.tenantId !== tenant.id) {
        return new Response("Not authorized", { status: 403 });
      }
    } else if (share.share.accessType === "email") {
      if (!("email" in profile) || !share.share.recipientEmails?.includes(profile.email as string)) {
        return new Response("Not authorized", { status: 403 });
      }
    }

    // Get conversation messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, share.conversation.id))
      .orderBy(messages.createdAt);

    const responseData = {
      conversation: share.conversation,
      messages: conversationMessages,
      isOwner: profile.id === share.conversation.profileId,
    };
    const validatedData = sharedConversationResponseSchema.parse(responseData);
    return Response.json(validatedData);
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
