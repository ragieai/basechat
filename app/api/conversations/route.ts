import assert from "assert";

import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAuthContext } from "@/lib/server/utils";

const createConversationRequest = z.object({ title: z.string() });

export async function POST(request: NextRequest) {
  const { profile, tenant } = await requireAuthContext();
  const json = await request.json();
  const { title } = createConversationRequest.parse(json);

  const rs = await db
    .insert(schema.conversations)
    .values({
      tenantId: tenant.id,
      profileId: profile.id,
      title,
    })
    .returning();

  assert(rs.length === 1);
  return Response.json({ id: rs[0].id });
}

export async function GET(request: NextRequest) {
  const { profile, tenant } = await requireAuthContext();

  const rs = await db
    .select({
      id: schema.conversations.id,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      updatedAt: schema.conversations.updatedAt,
    })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)))
    .orderBy(desc(schema.conversations.createdAt));

  return Response.json(rs);
}
