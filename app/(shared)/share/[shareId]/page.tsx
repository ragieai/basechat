import Conversation from "@/app/(main)/o/[slug]/conversations/[id]/conversation";

import { getShareData } from "./layout";

export default async function SharedConversationPage({ params }: { params: Promise<{ shareId: string }> }) {
  const p = await params;
  const { shareId } = p;

  const shareData = await getShareData(shareId);
  if (!shareData) {
    return <div>Share not found</div>;
  }

  const { formattedTenant, conversation } = shareData;

  return <Conversation tenant={formattedTenant} id={conversation.id} readOnly={true} />;
}
