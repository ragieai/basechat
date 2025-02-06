import { AppLocation } from "@/app/(main)/footer";
import Main from "@/app/(main)/main";
import { authOrRedirect } from "@/lib/server/server-utils";

import Conversation from "./conversation";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, tenant } = await authOrRedirect();
  const { id } = await params;

  return (
    <Main currentTenantId={tenant.id} name={session.user.name} appLocation={AppLocation.CHAT}>
      <Conversation tenantName={tenant.name} id={id} />
    </Main>
  );
}
