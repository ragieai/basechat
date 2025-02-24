import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; shareId: string }> },
) {
  const { profile, tenant } = await requireAuthContext();
  const { conversationId, shareId } = await params;

  // Verify conversation ownership
  await getConversation(tenant.id, profile.id, conversationId);

  // Delete share
  const [deletedShare] = await db
    .delete(sharedConversations)
    .where(
      and(
        eq(sharedConversations.conversationId, conversationId),
        eq(sharedConversations.shareId, shareId),
        eq(sharedConversations.tenantId, tenant.id),
      ),
    )
    .returning();

  if (!deletedShare) {
    return new Response("Share not found", { status: 404 });
  }

  return new Response(null, { status: 204 });
}
