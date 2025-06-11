import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";

import { BASE_URL, GOOGLE_TASKS_SERVICE_ACCOUNT } from "@/lib/server/settings";

import { handleSlackEvent } from "../handlers";

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
    if (GOOGLE_TASKS_SERVICE_ACCOUNT && payload.email !== GOOGLE_TASKS_SERVICE_ACCOUNT) {
      console.log(`Invalid service account. Expected: ${GOOGLE_TASKS_SERVICE_ACCOUNT}, Got: ${payload.email}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verifying Cloud Tasks request:", error);
    return false;
  }
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
