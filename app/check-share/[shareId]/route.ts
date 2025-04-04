import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import auth from "@/auth";
import db from "@/lib/server/db";
import { conversations, messages, sharedConversations, tenants } from "@/lib/server/db/schema";
import { createProfile, findProfileByTenantIdAndUserId, getShareByShareId } from "@/lib/server/service";
import getSession from "@/lib/server/session";
import { getSignInUrl } from "@/lib/utils";

// Get information about a share for guests only
export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const share = await getShareByShareId(shareId);

    if (!share || !share.conversation || !share.tenant || share.share.accessType !== "public") {
      return Response.redirect(getSignInUrl(request.url));
    }

    const session = await getSession();

    // Handle authentication
    if (session) {
      const profile = await findProfileByTenantIdAndUserId(share.tenant.id, session.user.id);
      if (!profile) {
        await createProfile(share.tenant.id, session.user.id, "guest");
      }
    } else {
      const data = await auth.api.signInAnonymous();
      if (!data) {
        throw new Error("Could not sign in");
      }
      const userId = data.user.id;
      await createProfile(share.tenant.id, userId, "guest");
    }

    // Redirect to the proper URL with the current tenant slug
    return Response.redirect(new URL(`/o/${share.tenant.slug}/share/${shareId}`, request.url));
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
