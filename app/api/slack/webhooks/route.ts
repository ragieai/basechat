import { SlackEvent } from "@slack/types";
import { NextRequest, NextResponse } from "next/server";

import { enqueueSlackEventTask } from "@/lib/server/cloud-tasks";
import { GOOGLE_CLOUD_TASKS_QUEUE, SLACK_ALLOW_UNVERIFIED_WEBHOOKS, SLACK_SIGNING_SECRET } from "@/lib/server/settings";
import { verifySlackSignature } from "@/lib/server/slack";

import { handleSlackEvent } from "../handlers";

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

export async function POST(request: NextRequest) {
  console.log("Received Slack webhook");

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

      // Enqueue task to Google Cloud Tasks for async processing
      if (slackEvent.event) {
        if (GOOGLE_CLOUD_TASKS_QUEUE) {
          await enqueueSlackEventTask({ event: slackEvent.event });
          console.log("Successfully enqueued Slack event task");
        } else {
          setTimeout(async () => {
            console.warn("Processing Slack event handler inside setTimeout. This is not recommended for production.");
            await handleSlackEvent(slackEvent.event);
          }, 0);
        }
      } else {
        console.warn("No event in Slack event callback");
      }

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
