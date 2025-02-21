import { nanoid } from "nanoid";
import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

// Validate request body
const createShareRequestSchema = z.object({
  accessType: z.enum(["public", "organization", "email"]).default("public"),
  recipientEmails: z.array(z.string().email()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { profile, tenant } = await requireAuthContext();
  const { conversationId } = await params;

  // Verify conversation ownership
  const conversation = await getConversation(tenant.id, profile.id, conversationId);

  // Parse request body
  const json = await request.json();
  const body = createShareRequestSchema.parse(json);

  // Create share record
  const [share] = await db
    .insert(sharedConversations)
    .values({
      conversationId: conversation.id,
      tenantId: tenant.id,
      createdBy: profile.id,
      shareId: nanoid(12), // Generate URL-friendly unique ID
      accessType: body.accessType,
      recipientEmails: body.recipientEmails || [],
      expiresAt: body.expiresAt,
    })
    .returning();

  return Response.json({ shareId: share.shareId });
}
