import { NextRequest } from "next/server";

import { getConversationMessage } from "@/lib/data-access/conversation";
import { requireAuthContext } from "@/lib/server-utils";

type Params = { conversationId: string; messageId: string };

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { tenant } = await requireAuthContext();
  const { conversationId, messageId } = await params;
  const message = await getConversationMessage(tenant.id, conversationId, messageId);

  return Response.json(message);
}
