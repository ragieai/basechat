import assert from "assert";

import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { requireAuthContext } from "@/lib/server-utils";

const createConversationRequest = z.object({ title: z.string() });

export async function POST(request: NextRequest) {
  const { tenant } = await requireAuthContext();
  const json = await request.json();
  const { title } = createConversationRequest.parse(json);

  const rs = await db.insert(schema.conversations).values({ tenantId: tenant.id, title }).returning();
  assert(rs.length === 1);
  return Response.json({ id: rs[0].id });
}

export async function GET(request: NextRequest) {
  const { tenant } = await requireAuthContext();

  const rs = await db
    .select({
      id: schema.conversations.id,
      title: schema.conversations.title,
      createdAt: schema.conversations.createdAt,
      updatedAt: schema.conversations.updatedAt,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.tenantId, tenant.id))
    .orderBy(desc(schema.conversations.createdAt));

  return Response.json(rs);
}
