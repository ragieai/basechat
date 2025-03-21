import db from "./db";
import { users, userTypeEnum, profiles, rolesEnum } from "./db/schema";

export interface AnonymousUser {
  id: string;
  type: "anonymous";
  createdAt: Date;
  profileId: string;
}

export interface PublicCookie {
  userId: string;
  tenantSlugs: string[];
}

export async function createAnonymousUser(tenantId: string): Promise<AnonymousUser> {
  // Create a new user with no email/password
  const [newUser] = await db
    .insert(users)
    .values({
      name: "Anonymous User",
      type: "anonymous" as const,
    })
    .returning();

  // Create a profile for the anonymous user
  const [newProfile] = await db
    .insert(profiles)
    .values({
      userId: newUser.id,
      tenantId: tenantId,
      role: "user" as (typeof rolesEnum.enumValues)[number],
    })
    .returning();

  return {
    id: newUser.id,
    type: "anonymous",
    createdAt: new Date(newUser.createdAt),
    profileId: newProfile.id,
  };
}

export function getPublicCookie(cookies: { [key: string]: string }): PublicCookie | null {
  const cookie = cookies["public_user"];
  if (!cookie) return null;

  try {
    return JSON.parse(decodeURIComponent(cookie)) as PublicCookie;
  } catch {
    return null;
  }
}

export function setPublicCookie(
  userId: string,
  tenantSlug: string,
  existingCookie?: PublicCookie | null,
): PublicCookie {
  const tenantSlugs = existingCookie?.tenantSlugs || [];
  if (!tenantSlugs.includes(tenantSlug)) {
    tenantSlugs.push(tenantSlug);
  }

  const cookie: PublicCookie = {
    userId,
    tenantSlugs,
  };

  return cookie;
}

export function clearPublicCookie(): void {
  // This will be handled by the response headers in the middleware
}
