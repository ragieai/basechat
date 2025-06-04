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
import { NextRequest, NextResponse } from "next/server";

import {
  ConversationContext,
  MessageDAO,
  ReplyGenerator,
  Retriever,
  generatorFactory,
} from "@/lib/server/conversation-context";
import { SLACK_ALLOW_UNVERIFIED_WEBHOOKS, SLACK_SIGNING_SECRET } from "@/lib/server/settings";
import { verifySlackSignature } from "@/lib/server/slack";

import { formatMessageWithSources, shouldReplyToMessage, slackSignIn } from "./utils";

// Webhook payload wrapper types (these are specific to webhook delivery, not individual events)
interface SlackWebhookPayload {
  type: "event_callback" | "url_verification";
  event_id?: string;
  event_time?: number;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  challenge?: string;
  token?: string;
}

interface SlackUrlVerification {
  type: "url_verification";
  challenge: string;
  token: string;
}

// Handle different types of Slack events
async function handleSlackEvent(event: SlackEvent | undefined): Promise<void> {
  if (!event) return;

  console.log(`Handling Slack event: ${event.type}`);

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

  const shouldReply = await shouldReplyToMessage(event.text);
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

  const retriever = new Retriever(tenant, {
    isBreadth: false,
    rerankEnabled: true,
    prioritizeRecent: false,
  });
  const context = await ConversationContext.fromMessageEvent(tenant, profile, event, retriever);
  const replyContext = await context.promptSlackMessage(profile, event);
  const generator = new ReplyGenerator(new MessageDAO(tenant.id), generatorFactory("gpt-4o"));
  const object = await generator.generateObject(replyContext);

  const text = formatMessageWithSources(object, replyContext);

  await slack.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text,
  });

  await slack.reactions.remove({
    channel: event.channel,
    timestamp: event.ts,
    name: "thinking_face",
  });
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
    const body = await request.text();
    const timestamp = request.headers.get("x-slack-request-timestamp");
    const signature = request.headers.get("x-slack-signature");

    // Verify the request came from Slack
    if (SLACK_SIGNING_SECRET && timestamp && signature) {
      const isValid = verifySlackSignature(SLACK_SIGNING_SECRET, body, timestamp, signature);
      if (!isValid) {
        console.error("Invalid Slack signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (SLACK_SIGNING_SECRET) {
      console.error("Missing signature headers");
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    } else if (SLACK_ALLOW_UNVERIFIED_WEBHOOKS) {
      console.warn("Skipping Slack signature verification because SLACK_ALLOW_UNVERIFIED_WEBHOOKS is true");
    } else {
      console.error("Slack signing secret not configured");
      return NextResponse.json({ error: "Bad server configuration" }, { status: 500 });
    }

    const slackEvent: SlackWebhookPayload = JSON.parse(body);

    // Handle URL verification challenge
    if (slackEvent.type === "url_verification") {
      const verification = slackEvent as SlackUrlVerification;
      console.log("Handling URL verification challenge");
      return NextResponse.json({ challenge: verification.challenge });
    }

    // Handle event callbacks
    if (slackEvent.type === "event_callback") {
      console.log("Received event callback:", slackEvent.event?.type);

      // Intentional setTimeout so we can respond quickly to the webhook request
      setTimeout(async () => {
        await handleSlackEvent(slackEvent.event);
      }, 0);

      // Always respond quickly to avoid retries
      return NextResponse.json({ ok: true });
    }

    // Handle other event types
    console.log(`Received Slack event type: ${slackEvent.type}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing Slack webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: "Slack webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
