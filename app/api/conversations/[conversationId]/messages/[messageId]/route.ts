import { NextRequest } from "next/server";

import { getConversationMessage } from "@/lib/server/service";
import { requireAuthContextFromRequest } from "@/lib/server/utils";

type Params = { conversationId: string; messageId: string };

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { profile, tenant } = await requireAuthContextFromRequest(request);
  const { conversationId, messageId } = await params;
  const message = await getConversationMessage(tenant.id, profile.id, conversationId, messageId);

  return Response.json(message);
}
