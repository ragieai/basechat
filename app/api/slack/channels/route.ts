import { WebClient } from "@slack/web-api";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/server/utils";

export async function GET(request: NextRequest) {
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

    const slack = new WebClient(tenant.slackBotToken);

    // Fetch public channels
    const channelsResponse = await slack.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
    });

    if (!channelsResponse.ok) {
      console.error("Failed to fetch Slack channels:", channelsResponse.error);
      return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
    }

    const channels =
      channelsResponse.channels?.map((channel) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isMember: channel.is_member,
        memberCount: channel.num_members,
      })) || [];

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
