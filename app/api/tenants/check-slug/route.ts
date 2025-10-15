import { and, eq, not } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v3";

import db from "@/lib/server/db";
import { tenants } from "@/lib/server/db/schema";
import { requireSession } from "@/lib/server/utils";

const checkSlugSchema = z.object({
  slug: z.string().min(1),
  tenantId: z.string().optional(),
});

// returns available: boolean
// true if slug does not exist in any tenant besides the tenantId passed in

export async function POST(req: Request) {
  await requireSession();
  try {
    const body = await req.json();
    const { slug, tenantId: tenantIdToExclude } = checkSlugSchema.parse(body);

    // If tenantId is provided, exclude that tenant from the check
    // This allows us to check if the slug is unique among other tenants
    const query = tenantIdToExclude
      ? and(eq(tenants.slug, slug), not(eq(tenants.id, tenantIdToExclude)))
      : eq(tenants.slug, slug);

    const existingTenant = await db.select().from(tenants).where(query).limit(1);

    return NextResponse.json({
      available: existingTenant.length === 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
