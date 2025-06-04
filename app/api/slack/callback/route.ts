import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { getSlackSettingsPath } from "@/lib/paths";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, BASE_URL } from "@/lib/server/settings";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // tenant slug
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Slack OAuth error:", error);
    return Response.redirect(`${BASE_URL}/o/${state}/settings/slack?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return Response.redirect(`${BASE_URL}/o/${state}/settings/slack?error=missing_code_or_state`);
  }

  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    return Response.redirect(`${BASE_URL}/o/${state}/settings/slack?error=oauth_not_configured`);
  }

  try {
    // Create Slack OAuth client using the utility function
    const slack = new WebClient();

    // Exchange code for access token using the SDK
    const tokenData = await slack.oauth.v2.access({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${BASE_URL}/api/slack/callback`,
    });

    if (!tokenData.ok) {
      console.error("Slack token exchange failed:", tokenData.error);
      return Response.redirect(
        `${BASE_URL}/o/${state}/settings/slack?error=${encodeURIComponent(tokenData.error as string)}`,
      );
    }

    // Update tenant with bot token and team info
    await db
      .update(schema.tenants)
      .set({
        slackEnabled: true,
        slackBotToken: tokenData.access_token,
        slackTeamId: tokenData.team?.id,
        slackTeamName: tokenData.team?.name,
      })
      .where(eq(schema.tenants.slug, state));

    // Redirect back to Slack settings with success
    return Response.redirect(`${BASE_URL}${getSlackSettingsPath(state)}?success=true`);
  } catch (error) {
    console.error("Slack OAuth callback error:", error);
    return Response.redirect(`${BASE_URL}/o/${state}/settings/slack?error=callback_failed`);
  }
}
