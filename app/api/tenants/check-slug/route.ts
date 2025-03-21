import { and, eq, not } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/lib/server/db";
import { tenants } from "@/lib/server/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const tenantId = searchParams.get("tenantId");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const query = tenantId ? and(eq(tenants.slug, slug), not(eq(tenants.id, tenantId))) : eq(tenants.slug, slug);

  const existingTenant = await db.select().from(tenants).where(query).limit(1);

  return NextResponse.json({ isUnique: existingTenant.length === 0 });
}
