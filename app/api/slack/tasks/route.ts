import assert from "assert";

import {
  AllMessageEvents,
  AppMentionEvent,
  GenericMessageEvent,
  MemberJoinedChannelEvent,
  MemberLeftChannelEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
  SlackEvent,
} from "@slack/types";
import { WebClient } from "@slack/web-api";
import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";

import {
  ConversationContext,
  MessageDAO,
  ReplyGenerator,
  Retriever,
  generatorFactory,
} from "@/lib/server/conversation-context";
import { BASE_URL, GOOGLE_CLOUD_TASKS_SERVICE_ACCOUNT } from "@/lib/server/settings";

import { formatMessageWithSources, isAnswered, shouldReplyToMessage, slackSignIn } from "../webhooks/utils";

// Verify that the request comes from Google Cloud Tasks with OIDC token verification
async function verifyCloudTasksRequest(request: NextRequest): Promise<boolean> {
  try {
    // First verify Cloud Tasks headers are present
    const queueName = request.headers.get("X-CloudTasks-QueueName");
    const taskName = request.headers.get("X-CloudTasks-TaskName");

    if (!queueName || !taskName) {
      console.log("Missing required Cloud Tasks headers");
      return false;
    }

    // Verify OIDC token if present (requires queue configured with OIDC authentication)
    const authHeader = request.headers.get("Authorization") || request.headers.get("X-Serverless-Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header");
      return false;
    }

    const token = authHeader.substring(7);
    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: `${BASE_URL}${request.nextUrl.pathname}`,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.log("Invalid OIDC token payload");
      return false;
    }

    // Verify the issuer is Google
    if (payload.iss !== "https://accounts.google.com") {
      console.log("Invalid token issuer");
      return false;
    }

    // Verify the service account email if specified
    if (GOOGLE_CLOUD_TASKS_SERVICE_ACCOUNT && payload.email !== GOOGLE_CLOUD_TASKS_SERVICE_ACCOUNT) {
      console.log(`Invalid service account. Expected: ${GOOGLE_CLOUD_TASKS_SERVICE_ACCOUNT}, Got: ${payload.email}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verifying Cloud Tasks request:", error);
    return false;
  }
}

// Handle different types of Slack events
async function handleSlackEvent(event: SlackEvent | undefined): Promise<void> {
  if (!event) return;

  console.log(`Processing Slack event via Cloud Tasks: ${event.type}`);

  switch (event.type) {
    case "message":
      await handleMessage(event as AllMessageEvents);
      break;

    case "app_mention":
      await handleAppMention(event);
      break;

    case "member_joined_channel":
      await handleMemberJoinedChannel(event);
      break;

    case "member_left_channel":
      await handleMemberLeftChannel(event);
      break;

    case "reaction_added":
      await handleReactionAdded(event);
      break;

    case "reaction_removed":
      await handleReactionRemoved(event);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleMessage(event: AllMessageEvents): Promise<void> {
  if (event.subtype && event.subtype !== undefined) {
    console.log(`Skipping message with subtype: ${event.subtype}`);
    return;
  }
  return _handleMessage(event);
}

async function handleAppMention(event: AppMentionEvent): Promise<void> {
  return _handleMessage(event);
}

async function _handleMessage(event: AppMentionEvent | GenericMessageEvent) {
  if (!event.team) {
    throw new Error("No team ID found in app mention event");
  }

  if (!event.user) {
    throw new Error("No user ID found in app mention event");
  }

  if (event.bot_id) {
    console.log(`Skipping message from bot: ${event.bot_id}`);
    return;
  }

  const { tenant, profile } = await slackSignIn(event.team, event.user);

  assert(tenant.slackBotToken, "expected slack bot token");

  if (tenant.slackResponseMode === "mentions" && event.type !== "app_mention") {
    console.log(`Skipping message - mentions only mode`);
    return;
  }

  const userMessage = event.text;
  const shouldReply = await shouldReplyToMessage(userMessage);
  if (!shouldReply) {
    console.log(`Skipping message that did not meet the criteria for a reply`);
    return;
  }

  const slack = new WebClient(tenant.slackBotToken);

  await slack.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: "thinking_face",
  });

  try {
    const retriever = new Retriever(tenant, {
      isBreadth: false,
      rerankEnabled: true,
      prioritizeRecent: false,
    });
    const context = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);
    const replyContext = await context.promptSlackMessage(profile, event);
    const generator = new ReplyGenerator(new MessageDAO(tenant.id), generatorFactory("gpt-4o"));
    const object = await generator.generateObject(replyContext);

    if (object.usedSourceIndexes.length > 0) {
      const answered = await isAnswered(userMessage ?? "", object.message);
      if (answered) {
        const text = formatMessageWithSources(object, replyContext);

        await slack.chat.postMessage({
          channel: event.channel,
          thread_ts: event.ts,
          text,
        });
      } else {
        console.log(`Reply was not an adequate response because it did not give an insightful answer, skipping`);
      }
    } else {
      console.log(`Reply was not an adequate response because it did not use any sources, skipping`);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    // Don't rethrow - we want to remove the thinking face even if processing fails
  } finally {
    await slack.reactions.remove({
      channel: event.channel,
      timestamp: event.ts,
      name: "thinking_face",
    });
  }
}

async function handleMemberJoinedChannel(event: MemberJoinedChannelEvent): Promise<void> {
  console.log("Member joined channel:", {
    channel: event.channel,
    user: event.user,
  });

  // Add your member joined logic here
  // For example: send welcome message, notify admins, etc.
}

async function handleMemberLeftChannel(event: MemberLeftChannelEvent): Promise<void> {
  console.log("Member left channel:", {
    channel: event.channel,
    user: event.user,
  });

  // Add your member left logic here
}

async function handleReactionAdded(event: ReactionAddedEvent): Promise<void> {
  console.log("Reaction added:", {
    user: event.user,
    reaction: event.reaction,
    item: event.item,
  });

  // Add your reaction added logic here
}

async function handleReactionRemoved(event: ReactionRemovedEvent): Promise<void> {
  console.log("Reaction removed:", {
    user: event.user,
    reaction: event.reaction,
    item: event.item,
  });

  // Add your reaction removed logic here
}

export async function POST(request: NextRequest) {
  try {
    const isVerified = await verifyCloudTasksRequest(request);

    if (!isVerified) {
      console.error("Unauthorized request - not from Cloud Tasks");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event } = body;

    if (!event) {
      console.error("No event data in request body");
      return NextResponse.json({ error: "Missing event data" }, { status: 400 });
    }

    await handleSlackEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Slack event in Cloud Tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
