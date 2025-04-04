import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/server/db";
import { messages } from "@/lib/server/db/schema";
import { getShareByShareId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

// Get information about a share
export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const share = await getShareByShareId(shareId);

    if (!share) {
      console.log("no share");
    }
    if (!share?.conversation) {
      console.log("no conversation");
    }
    if (!share?.tenant) {
      console.log("no tenant");
    }

    if (!share || !share.conversation || !share.tenant) {
      return new Response("Shared conversation not found", { status: 404 });
    }

    const session = await requireSession();

    // Get conversation messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, share.conversation.id))
      .orderBy(messages.createdAt);

    const isOwner = share.share.createdBy === session.user.id;

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
      isOwner: isOwner,
    };

    return Response.json(responseData);
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
