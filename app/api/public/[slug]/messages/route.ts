import { CoreMessage } from "ai";
import assertNever from "assert-never";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import {
  generate,
  getGroundingSystemPrompt,
  getRetrievalSystemPrompt,
} from "@/app/api/conversations/[conversationId]/messages/utils";
import { conversationMessagesResponseSchema, createConversationMessageRequestSchema } from "@/lib/api";
import { getPublicCookie } from "@/lib/server/anonymous";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { createConversationMessage, getConversation, getConversationMessages } from "@/lib/server/service";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = await params;

  // Get tenant by slug
  const tenant = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1)
    .then((rows) => rows[0]);

  console.log("before 404", tenant?.id, tenant?.isPublic);
  if (!tenant || !tenant.isPublic) {
    return new Response("Not found", { status: 404 });
  }

  // Get public cookie
  const cookieStore = await cookies();
  const cookieMap = Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
  const publicCookie = getPublicCookie(cookieMap);

  if (!publicCookie) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get the profile for this user and tenant
  const profile = await db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.userId, publicCookie.userId), eq(schema.profiles.tenantId, tenant.id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  await sleep(5000);
  console.log("after sleep");

  // Get conversation for anonymous user
  const conversation = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)))
    .limit(1)
    .then((rows) => rows[0]);

  console.log("before 404", conversation?.id);
  console.log({ tenantId: tenant.id, profileId: profile.id });

  if (!conversation) {
    return new Response("Not found", { status: 404 });
  }

  const messages = await getConversationMessages(tenant.id, profile.id, conversation.id);
  return Response.json(conversationMessagesResponseSchema.parse(messages));
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = await params;

  // Get tenant by slug
  const tenant = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tenant || !tenant.isPublic) {
    return new Response("Not found", { status: 404 });
  }

  // Get public cookie
  const cookieStore = await cookies();
  const cookieMap = Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
  const publicCookie = getPublicCookie(cookieMap);

  if (!publicCookie) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get the profile for this user and tenant
  const profile = await db
    .select()
    .from(schema.profiles)
    .where(and(eq(schema.profiles.userId, publicCookie.userId), eq(schema.profiles.tenantId, tenant.id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  // Get conversation for anonymous user
  const conversation = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.tenantId, tenant.id), eq(schema.conversations.profileId, profile.id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!conversation) {
    return new Response("Not found", { status: 404 });
  }

  const json = await request.json();
  const { content } = createConversationMessageRequestSchema.parse(json);

  const existing = await getConversationMessages(tenant.id, profile.id, conversation.id);

  if (!existing.length) {
    await createConversationMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      role: "system",
      content: getGroundingSystemPrompt(
        {
          company: {
            name: tenant.name,
          },
        },
        tenant.groundingPrompt,
      ),
      sources: [],
    });
  }

  await createConversationMessage({
    tenantId: tenant.id,
    conversationId: conversation.id,
    role: "user",
    content,
    sources: [],
  });

  let sources: { documentId: string; documentName: string }[] = [];

  const { content: systemMessageContent, sources: ragSources } = await getRetrievalSystemPrompt(
    tenant.id,
    tenant.name,
    content,
  );

  sources = ragSources;

  await createConversationMessage({
    tenantId: tenant.id,
    conversationId: conversation.id,
    role: "system",
    content: systemMessageContent,
    sources: [],
  });

  const all = await getConversationMessages(tenant.id, profile.id, conversation.id);
  const messages: CoreMessage[] = all.map(({ role, content }) => {
    switch (role) {
      case "assistant":
        return { role: "assistant" as const, content: content ?? "" };
      case "user":
        return { role: "user" as const, content: content ?? "" };
      case "system":
        return { role: "system" as const, content: content ?? "" };
      default:
        assertNever(role);
    }
  });

  const [stream, messageId] = await generate(tenant.id, profile.id, conversation.id, { messages, sources });
  return stream.toTextStreamResponse({ headers: { "x-message-id": messageId } });
}
