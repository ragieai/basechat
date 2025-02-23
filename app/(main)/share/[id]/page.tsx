import { authOrRedirect } from "@/lib/server/utils";

import Conversation from "../../conversations/[id]/conversation";

export default async function SharedConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await authOrRedirect();
  const { id } = await params;

  return <Conversation tenantName={tenant.name} id={id} isShared={true} />;
}
