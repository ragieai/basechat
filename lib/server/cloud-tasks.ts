import assert from "assert";

import { CloudTasksClient } from "@google-cloud/tasks";
import { SlackEvent } from "@slack/types";

import {
  BASE_URL,
  GOOGLE_TASKS_SERVICE_ACCOUNT,
  GOOGLE_PROJECT_ID,
  GOOGLE_TASKS_LOCATION,
  GOOGLE_TASKS_QUEUE,
} from "./settings";

// Initialize Cloud Tasks client
const cloudTasksClient = new CloudTasksClient();

interface SlackEventTask {
  event: SlackEvent;
}

export async function enqueueSlackEventTask(taskData: SlackEventTask): Promise<void> {
  assert(GOOGLE_PROJECT_ID, "GOOGLE_PROJECT_ID environment variable is required");
  assert(GOOGLE_TASKS_LOCATION, "GOOGLE_TASKS_LOCATION environment variable is required");
  assert(GOOGLE_TASKS_QUEUE, "GOOGLE_TASKS_QUEUE environment variable is required");

  const queuePath = cloudTasksClient.queuePath(GOOGLE_PROJECT_ID, GOOGLE_TASKS_LOCATION, GOOGLE_TASKS_QUEUE);

  const url = `${BASE_URL}/api/slack/tasks`;
  const payload = JSON.stringify(taskData);

  console.log("Enqueuing Cloud Tasks task:", {
    queue: queuePath,
    url,
    eventType: taskData.event?.type,
  });

  assert(GOOGLE_TASKS_SERVICE_ACCOUNT, "GOOGLE_TASKS_SERVICE_ACCOUNT environment variable is required");

  const [response] = await cloudTasksClient.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        httpMethod: "POST" as const,
        url,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(payload).toString("base64"),
        oauthToken: null,
        oidcToken: { serviceAccountEmail: GOOGLE_TASKS_SERVICE_ACCOUNT },
      },
    },
  });

  console.log("Cloud Tasks task created:", response.name);
}
