import { authOrRedirect } from "@/lib/server/utils";

import Conversation from "./conversation";

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const p = await params;
  const { tenant } = await authOrRedirect(p.slug);
  const { id } = p;

  return <Conversation tenant={tenant} id={id} />;
}
