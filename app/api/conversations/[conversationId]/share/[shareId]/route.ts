import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

// Schema for validating request body
const deleteShareSchema = z.object({
  tenantSlug: z.string(),
});

// Delete a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; shareId: string }> },
) {
  const { conversationId, shareId } = await params;
  try {
    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const validationResult = deleteShareSchema.safeParse(body);
    if (!validationResult.success) return new NextResponse("Invalid request body", { status: 400 });

    const { tenantSlug } = validationResult.data;
    const { profile, tenant } = await requireAuthContext(tenantSlug);

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
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
