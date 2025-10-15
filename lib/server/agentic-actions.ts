"use server";

import assert from "assert";

import { z } from "zod/v3";

import { finalAnswerSchema, stepResultSchema, evidenceSchema } from "@/components/agentic-retriever/types";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";

// Schema for the agentic info that gets stored in the JSONB column
const agenticInfoSchema = z.object({
  runId: z.string(),
  timestamp: z.string(),
  stepTiming: z.array(z.number()),
  steps: z.array(stepResultSchema),
  query: z.string(),
  result: z.union([finalAnswerSchema, z.null()]),
  effort: z.string(),
});

type AgenticInfo = z.infer<typeof agenticInfoSchema>;

/**
 * Saves only the user message for an agentic retrieval run
 * This is called when the agentic retrieval starts
 */
export async function saveAgenticUserMessage({
  conversationId,
  tenantId,
  userMessage,
}: {
  conversationId: string;
  tenantId: string;
  userMessage: string;
}) {
  try {
    // Create user message
    const userMessageResult = await db
      .insert(schema.messages)
      .values({
        conversationId,
        tenantId,
        content: userMessage,
        role: "user",
        sources: [],
        model: "Deep Search", // Agentic mode uses "Deep Search" as the model
        isBreadth: false, // Agentic mode doesn't use breadth/depth
        rerankEnabled: false, // Agentic mode has its own retrieval logic
        prioritizeRecent: false, // Agentic mode has its own retrieval logic
        type: "agentic",
        agenticInfo: null, // User messages don't have agentic info
      })
      .returning();

    assert(userMessageResult.length === 1, "Expected 1 user message to be created");

    return userMessageResult[0];
  } catch (error) {
    console.error("Error saving agentic user message:", {
      error,
      conversationId,
      tenantId,
      userMessage: userMessage.substring(0, 100) + "...", // Log first 100 chars to avoid huge logs
    });
    throw error;
  }
}

/**
 * Saves only the assistant message for an agentic retrieval run
 * This is called when the agentic retrieval completes
 */
export async function saveAgenticAssistantMessage({
  conversationId,
  tenantId,
  agenticInfo,
  sources,
}: {
  conversationId: string;
  tenantId: string;
  agenticInfo: AgenticInfo;
  sources: Array<{
    source_type: string;
    file_path: string;
    source_url: string;
    documentId: string;
    documentName: string;
  }>;
}) {
  try {
    const validatedAgenticInfo = agenticInfoSchema.parse(agenticInfo);

    // Create assistant message with agentic info
    const assistantMessageResult = await db
      .insert(schema.messages)
      .values({
        conversationId,
        tenantId,
        content: validatedAgenticInfo.result?.text || "",
        role: "assistant",
        sources: sources,
        model: "Deep Search",
        isBreadth: false,
        rerankEnabled: false,
        prioritizeRecent: false,
        type: "agentic",
        agenticInfo: validatedAgenticInfo,
      })
      .returning();

    assert(assistantMessageResult.length === 1, "Expected 1 assistant message to be created");

    return assistantMessageResult[0];
  } catch (error) {
    console.error("Error saving agentic assistant message:", {
      error,
      conversationId,
      tenantId,
      agenticInfo: {
        runId: agenticInfo.runId,
        timestamp: agenticInfo.timestamp,
        stepCount: agenticInfo.steps.length,
        hasResult: !!agenticInfo.result,
      },
      sourceCount: sources.length,
    });
    throw error;
  }
}
