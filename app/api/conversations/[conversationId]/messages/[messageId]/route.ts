import { NextRequest } from "next/server";

import { requireAuthContext } from "@/lib/server/server-utils";
import { getConversationMessage } from "@/lib/server/service";

type Params = { conversationId: string; messageId: string };

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { profile, tenant } = await requireAuthContext();
  const { conversationId, messageId } = await params;
  const message = await getConversationMessage(tenant.id, profile.id, conversationId, messageId);

  return Response.json(message);
}
