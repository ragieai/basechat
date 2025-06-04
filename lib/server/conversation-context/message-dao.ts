import assert from "assert";

import { and, asc, eq } from "drizzle-orm";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

type InsertMessage = Omit<typeof schema.messages.$inferInsert, "tenantId">;

export default class MessageDAO {
  constructor(private readonly _tenantId: string) {}

  async create(message: InsertMessage) {
    const rs = await db
      .insert(schema.messages)
      .values({
        ...message,
        tenantId: this._tenantId,
      })
      .returning();

    assert(rs.length === 1, "Expected 1 message to be created");

    return rs[0];
  }

  find({ conversationId }: { conversationId: string }) {
    return db.query.messages.findMany({
      where: and(eq(schema.messages.tenantId, this._tenantId), eq(schema.messages.conversationId, conversationId)),
      orderBy: [asc(schema.messages.createdAt)],
    });
  }

  async update(id: string, message: Partial<InsertMessage>) {
    const rs = await db
      .update(schema.messages)
      .set(message)
      .where(and(eq(schema.messages.id, id), eq(schema.messages.tenantId, this._tenantId)))
      .returning();

    assert(rs.length === 1, "Expected 1 message to be updated");

    return rs[0];
  }
}
