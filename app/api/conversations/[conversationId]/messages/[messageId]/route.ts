import { NextRequest } from "next/server";

import { getConversationMessage } from "@/lib/data-access/conversation";
import { authOrRedirect } from "@/lib/server-utils";

type Params = { conversationId: string; messageId: string };

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { profile, tenant } = await authOrRedirect();
  const { conversationId, messageId } = await params;
  const message = await getConversationMessage(tenant.id, profile.id, conversationId, messageId);

  return Response.json(message);
}
