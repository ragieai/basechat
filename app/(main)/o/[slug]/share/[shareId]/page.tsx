import { authOrRedirect } from "@/lib/server/utils";

import Conversation from "../../conversations/[id]/conversation";

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ shareId: string; slug: string }>;
}) {
  const p = await params;
  const { tenant } = await authOrRedirect(p.slug);
  const { shareId } = p;

  return <Conversation tenant={tenant} shareId={shareId} />;
}
