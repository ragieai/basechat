import { notFound } from "next/navigation";

import { SharedConversationResponse } from "@/lib/api";
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

  // Fetch shared conversation using the API
  const response = await fetch(`/api/shared/${shareId}`, {
    headers: {
      tenant: p.slug, // Add the tenant slug to headers
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }
    throw new Error(`Failed to fetch shared conversation: ${response.statusText}`);
  }

  const sharedConversation: SharedConversationResponse = await response.json();

  return <Conversation tenant={tenant} id={sharedConversation.conversation.id} isShared={true} />;
}

//TODO: is this where we have the access checks?
