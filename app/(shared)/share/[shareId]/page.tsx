import { redirect } from "next/navigation";

import { getShareData } from "@/lib/server/service";

import ReadOnlyConversation from "./read-only-conversation";

export default async function SharedConversationPage({ params }: { params: Promise<{ shareId: string }> }) {
  const p = await params;
  const { shareId } = p;

  const shareData = await getShareData(shareId);
  if (!shareData) {
    redirect("/sign-in");
  }
  const { formattedTenant, conversation } = shareData;

  return <ReadOnlyConversation tenant={formattedTenant} id={conversation.id} />;
}
