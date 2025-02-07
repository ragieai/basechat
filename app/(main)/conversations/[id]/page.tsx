import { authOrRedirect } from "@/lib/server/utils";

import Conversation from "./conversation";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await authOrRedirect();
  const { id } = await params;

  return <Conversation tenantName={tenant.name} id={id} />;
}
