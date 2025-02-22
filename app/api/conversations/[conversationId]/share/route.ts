import { randomUUID } from "crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import { sharedConversations } from "@/lib/server/db/schema";
import { getConversation } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

// Validate request body
const createShareRequestSchema = z
  .object({
    accessType: z.enum(["public", "organization", "email"]).default("public"),
    recipientEmails: z.array(z.string().email()).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .refine((data) => data.accessType !== "email" || (data.recipientEmails && data.recipientEmails.length > 0), {
    message: "recipientEmails required when accessType is 'email'",
  });

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { profile, tenant } = await requireAuthContext();
    const { conversationId } = await params;

    // Parse request body first to fail fast on invalid input
    const json = await request.json();
    const body = createShareRequestSchema.parse(json);

    // Verify conversation ownership
    const conversation = await getConversation(tenant.id, profile.id, conversationId);

    // Create share record
    const [share] = await db
      .insert(sharedConversations)
      .values({
        conversationId: conversation.id,
        tenantId: tenant.id,
        createdBy: profile.id,
        shareId: randomUUID(),
        accessType: body.accessType,
        recipientEmails: body.recipientEmails || [],
        expiresAt: body.expiresAt,
      })
      .returning();

    return Response.json({ shareId: share.shareId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ errors: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}
