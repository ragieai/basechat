import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import PublicWelcome from "@/app/(main)/public-welcome";
import { getPublicCookie } from "@/lib/server/anonymous";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";


interface Props {
  params: {
    slug: string;
  };
}

export default async function PublicWelcomePage({ params }: Props) {
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

  // Show welcome screen
  return (
    <PublicWelcome
      tenantSlug={slug}
      tenant={{
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        question1: tenant.question1,
        question2: tenant.question2,
        question3: tenant.question3,
      }}
      className="flex-1 flex flex-col w-full bg-white p-4 max-w-[717px]"
    />
  );
}
