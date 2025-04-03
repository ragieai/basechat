import { redirect } from "next/navigation";

import { sharedConversationResponseSchema } from "@/lib/api";
import { requireSession } from "@/lib/server/utils";

interface Props {
  params: Promise<{ shareId: string }>;
}

export default async function ShareResolutionPage({ params }: Props) {
  const { shareId } = await params;

  // Get current user session
  const session = await requireSession();

  try {
    const response = await fetch(`/api/shared/${shareId}`);

    if (!response.ok) {
      if (response.status === 404) {
        redirect("/404"); // Or to a 404 page
      }
      redirect("/"); // Or to an error page
    }

    const rawData = await response.json();
    const result = sharedConversationResponseSchema.safeParse(rawData);

    if (!result.success) {
      console.error("Invalid share data:", result.error);
      redirect("/"); // Or to an error page
    }

    const data = result.data;

    // Check access permissions
    if (data.share.expiresAt && new Date(data.share.expiresAt) < new Date()) {
      redirect("/expired"); // Or to an expired link page
    }

    if (data.share.accessType === "organization" || data.share.accessType === "email") {
      if (!session) {
        // Need to be logged in
        redirect(`/login?callbackUrl=/share/${shareId}`);
      }

      if (data.share.accessType === "email" && !data.share.recipientEmails?.includes(session.user.email)) {
        redirect("/unauthorized"); // Or to an unauthorized page
      }
    }

    // If user is the owner of the conversation, redirect to the conversation page
    if (data.isOwner) {
      redirect(`/o/${data.tenant.slug}/conversations/${data.conversation.id}`);
    }

    // For organization shares, we'll need to verify tenant membership on the shared view page

    // Otherwise, redirect to the shared view page
    redirect(`/o/${data.tenant.slug}/share/${shareId}`);
  } catch (error) {
    console.error("Error resolving share:", error);
    redirect("/"); // Or to an error page
  }
}
