import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import auth from "@/auth";
import db from "@/lib/server/db";
import { conversations, messages, sharedConversations, tenants } from "@/lib/server/db/schema";
import { createProfile, findProfileByTenantIdAndUserId, getShareByShareId } from "@/lib/server/service";
import getSession from "@/lib/server/session";

// Create session AND get information about a share
export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const share = await getShareByShareId(shareId);

    if (!share || !share.conversation || !share.tenant) {
      return new Response("Shared conversation not found", { status: 404 });
    }

    const session = await getSession();

    console.log("session after getSession", session);

    let userId = null;
    let data = null;
    if (session) {
      const profile = await findProfileByTenantIdAndUserId(share.tenant.id, session.user.id);
      if (!profile) {
        await createProfile(share.tenant.id, session.user.id, "guest");
      }
    } else {
      data = await auth.api.signInAnonymous();
      if (!data) {
        throw new Error("Could not sign in");
      }
      userId = data.user.id;
      await createProfile(share.tenant.id, userId, "guest");
    }
    // Get conversation messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, share.conversation.id))
      .orderBy(messages.createdAt);

    const isOwner = share.share.createdBy === (userId ?? session?.user.id);

    console.log("share createdBy", share.share.createdBy);
    console.log("data after signInAnonymous", data);
    console.log("isOwner", isOwner);

    const responseData = {
      session: session,
      shareInfo: {
        share: {
          shareId: share.share.shareId,
          accessType: share.share.accessType,
          expiresAt: share.share.expiresAt,
          recipientEmails: share.share.recipientEmails,
          createdBy: share.share.createdBy,
        },
        conversation: share.conversation,
        messages: conversationMessages,
        tenant: {
          id: share.tenant.id,
          slug: share.tenant.slug,
        },
        isOwner: isOwner,
      },
    };

    //return Response.json(responseData);
    //users will only get to this page if they are unauthenticated I THINK?
    return Response.redirect(new URL(`/o/${share.tenant.slug}/share/${shareId}`, request.url));
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
