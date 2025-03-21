import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/lib/server/db";
import { tenants } from "@/lib/server/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

  return NextResponse.json({ isUnique: existingTenant.length === 0 });
}
