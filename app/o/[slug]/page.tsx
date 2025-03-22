import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import PublicWelcome from "@/app/(main)/public-welcome";
import { getPublicCookie } from "@/lib/server/anonymous";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

import PublicChat from "./public-chat";

interface Props {
  params: {
    slug: string;
  };
}

export default async function PublicChatPage({ params }: Props) {
  const { slug } = await params;

  // Get tenant by slug
  const tenant = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tenant || !tenant.isPublic) {
    notFound();
  }

  // Get public cookie
  const cookieStore = await cookies();
  const cookieMap = Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
  const publicCookie = getPublicCookie(cookieMap);

  if (!publicCookie) {
    notFound();
  }

  // Get the profile for this user and tenant
  const profile = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, publicCookie.userId) && eq(schema.profiles.tenantId, tenant.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!profile) {
    notFound();
  }

  // Get conversation for anonymous user
  const conversation = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.tenantId, tenant.id) && eq(schema.conversations.profileId, profile.id))
    .limit(1)
    .then((rows) => rows[0]);

  // If no conversation exists, redirect to welcome page
  if (!conversation) {
    redirect(`/o/${slug}/welcome`);
  }

  return (
    <PublicChat
      name={tenant.name}
      logoUrl={tenant.logoUrl}
      conversationId={conversation.id}
      isPublic={true}
      tenantSlug={slug}
    />
  );
}
