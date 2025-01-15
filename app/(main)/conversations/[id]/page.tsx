import { AppLocation } from "@/app/(main)/footer";
import Main from "@/app/(main)/main";
import { requireAuthContext } from "@/lib/server-utils";

import Conversation from "./conversation";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, tenant } = await requireAuthContext();
  const { id } = await params;

  return (
    <Main name={session.user.name} appLocation={AppLocation.CHAT}>
      <Conversation tenantName={tenant.name} id={id} />
    </Main>
  );
}
