import { Metadata } from "next";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { sharedConversationResponseSchema } from "@/lib/api";
import { isUserInTenant } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

interface Props {
  params: Promise<{ shareId: string }>;
}

async function getRedirectUrl(shareId: string) {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const host = headersList.get("host") || "";
  const baseUrl = `${protocol}://${host}`;

  try {
    // API call will create session and get shareInfo
    const response = await fetch(`${baseUrl}/check-share/${shareId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch share info:", response.status);
      return "/";
    }

    const { session, shareInfo } = await response.json();
    //await requireSession();
    // TODO: do we need to a session?

    console.log("shareInfo", shareInfo);
    console.log("session", session);

    const result = sharedConversationResponseSchema.safeParse(shareInfo);
    if (!result.success) {
      console.error("Invalid share data:", result.error);
      return "/";
    }

    const data = result.data;

    //console.log("data", data);

    // Check if authentication is required
    if (data.share.accessType !== "public" && !session) {
      return `/sign-in?callbackUrl=/share/${shareId}`;
    }

    // If user is the owner of the conversation, redirect to the conversation page
    if (session && data.isOwner) {
      return `/o/${data.tenant.slug}/conversations/${data.conversation.id}`;
    }

    // Check if share has expired
    if (data.share.expiresAt && new Date(data.share.expiresAt) < new Date()) {
      return "/";
    }

    // Check email access
    if (data.share.accessType === "email" && session) {
      if (!data.share.recipientEmails?.includes(session.user.email)) {
        return "/";
      }
    }

    // Check organization access
    if (data.share.accessType === "organization" && session) {
      if (!isUserInTenant(session.user.id, data.tenant.id)) {
        return "/";
      }
    }

    return `/o/${data.tenant.slug}/share/${shareId}`;
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
