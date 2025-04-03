import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createShareRequestSchema } from "@/lib/api";
import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

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

    return Response.json({ shareId: share.shareId });
  } catch (error) {
    console.error("Failed to create share:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
