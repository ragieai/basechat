import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";
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
  await db
    .delete(sharedConversations)
    .where(
      and(
        eq(sharedConversations.conversationId, conversationId),
        eq(sharedConversations.shareId, shareId),
        eq(sharedConversations.tenantId, tenant.id),
      ),
    );

  return new Response(null, { status: 204 });
}
