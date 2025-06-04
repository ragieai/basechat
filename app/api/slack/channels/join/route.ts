import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { requireAdminContext } from "@/lib/server/utils";

const joinChannelSchema = z.object({
  channelId: z.string(),
  action: z.enum(["join", "leave"]),
});

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    }

    const { tenant } = await requireAdminContext(tenantSlug);

    if (!tenant.slackBotToken) {
      return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
    }

    const body = await request.json();
    const { channelId, action } = joinChannelSchema.parse(body);

    const slack = new WebClient(tenant.slackBotToken);

    if (action === "join") {
      // Join the channel
      const joinResponse = await slack.conversations.join({
        channel: channelId,
      });

      if (!joinResponse.ok) {
        console.error("Failed to join Slack channel:", joinResponse.error);
        return NextResponse.json({ error: "Failed to join channel" }, { status: 500 });
      }

      // Add channel to tenant's configured channels
      const currentChannels = tenant.slackChannels || [];
      if (!currentChannels.includes(channelId)) {
        const updatedChannels = [...currentChannels, channelId];
        await db.update(schema.tenants).set({ slackChannels: updatedChannels }).where(eq(schema.tenants.id, tenant.id));
      }
    } else {
      // Leave the channel
      const leaveResponse = await slack.conversations.leave({
        channel: channelId,
      });

      if (!leaveResponse.ok) {
        console.error("Failed to leave Slack channel:", leaveResponse.error);
        return NextResponse.json({ error: "Failed to leave channel" }, { status: 500 });
      }

      // Remove channel from tenant's configured channels
      const currentChannels = tenant.slackChannels || [];
      const updatedChannels = currentChannels.filter((id) => id !== channelId);
      await db.update(schema.tenants).set({ slackChannels: updatedChannels }).where(eq(schema.tenants.id, tenant.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error managing Slack channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
