import { Metadata } from "next";

import { getShareByShareId, isUserInTenant } from "@/lib/server/service";
import requireSession from "@/lib/server/session";

interface Props {
  params: Promise<{ shareId: string }>;
}

async function getRedirectUrl(shareId: string) {
  try {
    // Get share info directly from the database
    const share = await getShareByShareId(shareId);
    const session = await requireSession();

    if (!share || !share.conversation || !share.tenant) {
      console.error("Share not found");
      return "/";
    }

    // If user is the owner of the conversation, redirect to the conversation page
    const isOwner = share.share.createdBy === session?.user.id;
    if (isOwner) {
      return `/o/${share.tenant.slug}/conversations/${share.conversation.id}`;
    }

    // Check if share has expired
    if (share.share.expiresAt && new Date(share.share.expiresAt) < new Date()) {
      return "/";
    }

    // Check if authentication is required
    if (share.share.accessType !== "public" && !session) {
      return `/sign-in?callbackUrl=/share/${shareId}`;
    }

    // Check email access
    if (share.share.accessType === "email" && session) {
      if (!share.share.recipientEmails?.includes(session.user.email)) {
        return "/";
      }
    }

    // Check organization access
    if (share.share.accessType === "organization" && session) {
      const hasAccess = await isUserInTenant(session.user.id, share.tenant.id);
      if (!hasAccess) {
        return "/";
      }
    }

    // If no session, redirect to check-share which will handle anonymous auth
    if (!session) {
      return `/check-share/${shareId}`;
    }

    // All checks passed, redirect to the proper share URL
    return `/o/${share.tenant.slug}/share/${shareId}`;
  } catch (error) {
    console.error("Error resolving share:", error);
    return "/";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const redirectUrl = await getRedirectUrl(shareId);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    alternates: {
      canonical: redirectUrl,
    },
  };
}

export default async function ShareResolutionPage({ params }: Props) {
  const { shareId } = await params;
  const redirectUrl = await getRedirectUrl(shareId);

  // This will trigger a client-side redirect
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.href = '${redirectUrl}';`,
      }}
    />
  );
}
