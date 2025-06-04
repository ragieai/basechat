import { GenericMessageEvent } from "@slack/web-api";
import { and, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/lib/server/db/schema";
import {
  initTestDb,
  closeTestDb,
  getTestDb,
  createTestTenant,
  createTestUser,
  createTestProfile,
  createTestConversation,
  cleanupTestTenant,
} from "@/lib/test";

import ConversationContext, { Retriever } from "./conversation-context";
import MessageDAO from "./message-dao";

class TestRetriever extends Retriever {
  constructor(tenant: typeof schema.tenants.$inferSelect) {
    super(tenant, { isBreadth: false, rerankEnabled: false, prioritizeRecent: false });
  }

  retrieve(_query: string) {
    return Promise.resolve({ content: "Retrieval system prompt", sources: [] });
  }
}

let db: NodePgDatabase<typeof schema>;

beforeAll(async () => {
  const { db: testDb } = await initTestDb();
  db = testDb;
});

afterAll(async () => {
  await closeTestDb();
});

function createTestEvent(event: Partial<GenericMessageEvent> = {}): GenericMessageEvent {
  return {
    type: "message",
    subtype: undefined,
    event_ts: "123456789.123",
    channel_type: "channel",
    channel: "C123",
    user: "U123",
    text: "hello",
    ts: "123456789.123",
    ...event,
  };
}

describe(ConversationContext, () => {
  let tenant: typeof schema.tenants.$inferSelect;
  let profile: typeof schema.profiles.$inferSelect;
  let user: typeof schema.users.$inferSelect;
  let retriever: Retriever;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser();
    profile = await createTestProfile(tenant, user, { role: "guest" });
    retriever = new TestRetriever(tenant);
  });

  afterEach(async () => {
    await cleanupTestTenant(tenant.id);
  });

  describe("fromMessageEvent", () => {
    it("should create a ConversationManager instance", async () => {
      const event = createTestEvent();
      const manager = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);
      expect(manager).toBeInstanceOf(ConversationContext);
    });

    describe("when a thread ID is not provided", () => {
      it("should create a new conversation", async () => {
        const event = createTestEvent({ thread_ts: undefined });
        const context = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);

        expect(context.conversation).not.toBeNull();
        expect(context.conversation.tenantId).toEqual(tenant.id);
        expect(context.conversation.title).toEqual("Slack conversation");
        expect(context.conversation.profileId).toEqual(profile.id);
        expect(context.conversation.slackThreadId).toEqual(event.ts);
      });
    });

    describe("when a thread ID is provided", () => {
      describe("and the conversation does not exist", () => {
        it("should create a new conversation", async () => {
          const conversation = await db.query.conversations.findFirst({
            where: and(
              eq(schema.conversations.tenantId, tenant.id),
              eq(schema.conversations.profileId, profile.id),
              eq(schema.conversations.slackThreadId, "123456789.123"),
            ),
          });

          expect(conversation).toBeUndefined();

          const event = createTestEvent({ thread_ts: "123456789.123" });
          const context = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);

          expect(context.conversation).not.toBeNull();
          expect(context.conversation.tenantId).toEqual(tenant.id);
          expect(context.conversation.title).toEqual("Slack conversation");
          expect(context.conversation.profileId).toEqual(profile.id);
          expect(context.conversation.slackThreadId).toEqual("123456789.123");
        });
      });

      describe("and the conversation exists", () => {
        it("should return the existing conversation", async () => {
          const conversation = await createTestConversation(tenant, profile, {
            title: "Slack conversation",
            slackThreadId: "123456789.123",
          });

          const event = createTestEvent({ thread_ts: "123456789.123" });
          const context = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);
          expect(context.conversation.id).toEqual(conversation.id);
        });
      });
    });
  });

  describe(ConversationContext.prototype.prompt, () => {
    let conversation: typeof schema.conversations.$inferSelect;

    beforeEach(async () => {
      conversation = await createTestConversation(tenant, profile, {
        title: "Slack conversation",
        slackThreadId: "123456789.123",
      });
    });

    describe("when the conversation has no messages", () => {
      beforeEach(async () => {
        const messages = await db.query.messages.findMany({
          where: eq(schema.messages.conversationId, conversation.id),
        });
        expect(messages).toHaveLength(0);
      });

      it("should add a system message and a user message to the conversation", async () => {
        const event = createTestEvent({ text: "hello" });
        const manager = new ConversationContext(new MessageDAO(tenant.id), retriever, tenant, conversation);
        await manager.promptSlackMessage(profile, event);

        const messages = await db.query.messages.findMany({
          where: eq(schema.messages.conversationId, conversation.id),
        });

        expect(messages).toHaveLength(3);

        expect(messages[0].role).toEqual("system");
        expect(messages[0].content).toContain("These are your instructions, they are very important to follow");

        expect(messages[1].role).toEqual("user");
        expect(messages[1].content).toEqual("hello");

        expect(messages[2].role).toEqual("system");
        expect(messages[2].content).toEqual("Retrieval system prompt");

        // TODO: Now that conversations are multi-user, we need to add a profileId to the message
        // expect(messages[1].profileId).toEqual(profile.id);
      });
    });

    describe("when the conversation has messages", () => {
      beforeEach(async () => {
        const event = createTestEvent({ text: "hello" });
        const manager = new ConversationContext(new MessageDAO(tenant.id), retriever, tenant, conversation);
        await manager.promptSlackMessage(profile, event);

        const messages = await db.query.messages.findMany({
          where: eq(schema.messages.conversationId, conversation.id),
        });
        expect(messages).toHaveLength(3);
      });

      it("should only add a user message to the conversation", async () => {
        const event = createTestEvent({ text: "hi hi" });

        const manager = new ConversationContext(new MessageDAO(tenant.id), retriever, tenant, conversation);
        await manager.promptSlackMessage(profile, event);

        const messages = await db.query.messages.findMany({
          where: eq(schema.messages.conversationId, conversation.id),
        });

        expect(messages).toHaveLength(5);

        expect(messages[0].role).toEqual("system");
        expect(messages[0].content).toContain("These are your instructions, they are very important to follow");

        expect(messages[1].role).toEqual("user");
        expect(messages[1].content).toEqual("hello");

        expect(messages[2].role).toEqual("system");
        expect(messages[2].content).toEqual("Retrieval system prompt");

        expect(messages[3].role).toEqual("user");
        expect(messages[3].content).toEqual("hi hi");

        expect(messages[4].role).toEqual("system");
        expect(messages[4].content).toEqual("Retrieval system prompt");
      });
    });
  });
});
