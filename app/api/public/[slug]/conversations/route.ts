import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getPublicCookie } from "@/lib/server/anonymous";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

const createConversationRequest = z.object({ title: z.string() });
// create a new public conversation
export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const json = await request.json();
  const { title } = createConversationRequest.parse(json);

  // Get tenant by slug
  const tenant = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tenant || !tenant.isPublic) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Get public cookie
  const cookieStore = request.cookies;
  const cookieMap = Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
  const publicCookie = getPublicCookie(cookieMap);

  if (!publicCookie) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the profile for this user and tenant
  const profile = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, publicCookie.userId) && eq(schema.profiles.tenantId, tenant.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  // Create conversation
  const [newConversation] = await db
    .insert(schema.conversations)
    .values({
      tenantId: tenant.id,
      profileId: profile.id,
      title,
    })
    .returning();

  return Response.json({ id: newConversation.id });
}
