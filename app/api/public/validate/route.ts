import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";

import { createAnonymousUser, getPublicCookie, setPublicCookie } from "@/lib/server/anonymous";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { slug } = await request.json();

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

  // Check for existing public cookie
  const cookieStore = request.cookies;
  const cookieMap = Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
  const publicCookie = getPublicCookie(cookieMap);

  let userId: string;
  let profileId: string;
  if (publicCookie) {
    userId = publicCookie.userId;
    // Get the profile for this user and tenant
    const profile = await db
      .select()
      .from(schema.profiles)
      .where(and(eq(schema.profiles.userId, userId), eq(schema.profiles.tenantId, tenant.id)))
      .limit(1)
      .then((rows: (typeof schema.profiles.$inferSelect)[]) => rows[0]);

    if (!profile) {
      // If no profile exists, create one
      const [newProfile] = await db
        .insert(schema.profiles)
        .values({
          userId,
          tenantId: tenant.id,
          role: "user" as (typeof schema.rolesEnum.enumValues)[number],
        })
        .returning();
      profileId = newProfile.id;
    } else {
      profileId = profile.id;
    }
  } else {
    // Create new anonymous user with profile
    const anonUser = await createAnonymousUser(tenant.id);
    userId = anonUser.id;
    profileId = anonUser.profileId;
  }

  // Set or update the public cookie
  const newCookie = setPublicCookie(userId, slug, publicCookie);

  return Response.json({
    userId,
    profileId,
    cookie: newCookie,
    tenantId: tenant.id,
  });
}
