import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContext();
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
}
