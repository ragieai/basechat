import { NextRequest } from "next/server";
import { z } from "zod";

import { BASE_URL, SLACK_CLIENT_ID } from "@/lib/server/settings";
import { requireAdminContext } from "@/lib/server/utils";

const tenantSchema = z.string();

export async function GET(request: NextRequest) {
  const slug = tenantSchema.parse(request.nextUrl.searchParams.get("tenant"));
  const { tenant } = await requireAdminContext(slug);

  if (!SLACK_CLIENT_ID) {
    return Response.json({ error: "Slack OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${BASE_URL}/api/slack/callback`;
  const state = tenant.slug; // Use tenant slug as state to identify which tenant is authorizing

  const scopes = [
    "chat:write",
    "channels:read",
    "channels:join",
    "channels:manage",
    "groups:read",
    "im:read",
    "mpim:read",
    "reactions:read",
    "reactions:write",
    "users:read",
  ].join(",");

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString());
}
