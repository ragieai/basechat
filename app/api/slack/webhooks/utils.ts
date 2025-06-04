import assert from "assert";

import { openai } from "@ai-sdk/openai";
import { WebClient } from "@slack/web-api";
import { generateObject } from "ai";
import Handlebars from "handlebars";
import { z } from "zod";

import { ConversationMessageResponse, ReplyContext } from "@/lib/server/conversation-context";
import * as schema from "@/lib/server/db/schema";
import {
  createProfile,
  createSlackUser,
  findProfileByTenantIdAndUserId,
  findUserBySlackUserId,
  getTenantBySlackTeamId,
} from "@/lib/server/service";

export function createSlackClient(tenant: typeof schema.tenants.$inferSelect) {
  assert(tenant.slackBotToken, "Slack bot token is required");
  return new WebClient(tenant.slackBotToken);
}

type Tenant = typeof schema.tenants.$inferSelect;

export interface SlackSignInOptions {
  slackClientFactory?: (tenant: Tenant) => WebClient;
}

export async function slackSignIn(teamId: string, slackUserId: string, options: SlackSignInOptions = {}) {
  const tenant = await getTenantBySlackTeamId(teamId);

  let user = await findUserBySlackUserId(slackUserId);
  if (!user) {
    const factory = options.slackClientFactory ?? createSlackClient;
    const client = factory(tenant);
    const userInfo = await client.users.info({ user: slackUserId });
    assert(userInfo.user, "User info is required");
    user = await createSlackUser(slackUserId, userInfo.user);
  }

  let profile = await findProfileByTenantIdAndUserId(tenant.id, user.id);
  if (!profile) {
    profile = await createProfile(tenant.id, user.id, "guest");
  }
  return { tenant, profile };
}

export async function shouldReplyToMessage(question?: string) {
  if (!question) {
    console.log(`Skipping message with no text`);
    return false;
  }
  return await isQuestion(question);
}

const IS_QUESTION_PROMPT = Handlebars.compile(`Is the follow text a question?

<text>{{text}}</text>

Answer in the form of a json object.  If the text is a question, answer with:
{"isQuestion": true}

If the text is NOT a question, answer with:
{"isQuestion:" false}`);

const isQuestionSchema = z.object({ isQuestion: z.boolean() });

async function isQuestion(text: string) {
  const { object } = await generateObject({
    model: openai("gpt-4.1-nano-2025-04-14"),
    prompt: IS_QUESTION_PROMPT({ text }),
    schema: isQuestionSchema,
  });
  return object.isQuestion;
}

export function formatMessageWithSources(object: ConversationMessageResponse, replyContext: ReplyContext): string {
  let messageText = object.message;

  if (object.usedSourceIndexes && object.usedSourceIndexes.length > 0) {
    messageText += "\n\n📚 *Sources:*";
    object.usedSourceIndexes.forEach((index) => {
      const source = replyContext.sources[index];
      if (source) {
        messageText += `\n• <${source.source_url}|${source.documentName}>`;
      }
    });
  }
  return messageText;
}
