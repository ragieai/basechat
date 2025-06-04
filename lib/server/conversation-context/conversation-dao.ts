import assert from "assert";

import { and, eq } from "drizzle-orm";

import db from "@/lib/server/db";
import { conversations } from "@/lib/server/db/schema";

type InsertConversation = Omit<typeof conversations.$inferInsert, "tenantId">;

export default class ConversationDAO {
  constructor(private readonly tenantId: string) {}

  async create(conversation: InsertConversation) {
    const rs = await db
      .insert(conversations)
      .values({
        tenantId: this.tenantId,
        ...conversation,
      })
      .returning();
    return rs[0];
  }

  find({ slackThreadId }: { slackThreadId: string }) {
    return db.query.conversations.findFirst({
      where: and(eq(conversations.tenantId, this.tenantId), eq(conversations.slackThreadId, slackThreadId)),
    });
  }
}
