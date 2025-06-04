import Handlebars from "handlebars";

import { DEFAULT_GROUNDING_PROMPT, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { SourceMetadata } from "@/lib/types";

export const FAILED_MESSAGE_CONTENT = `Failed to generate message from the model, please try again.`;

export async function getRetrievalSystemPrompt(
  tenant: typeof schema.tenants.$inferSelect,
  query: string,
  isBreadth: boolean,
  rerankEnabled: boolean,
  prioritizeRecent: boolean,
) {
  const { client, partition } = await getRagieClientAndPartition(tenant.id);
  const topK = isBreadth || rerankEnabled ? 30 : 6;

  let response = await client.retrievals.retrieve({
    partition,
    query,
    topK,
    rerank: rerankEnabled,
    recencyBias: prioritizeRecent,
    ...(isBreadth ? { maxChunksPerDocument: 4 } : {}),
  });

  console.log(`ragie response includes ${response.scoredChunks.length} chunk(s)`);

  if (response.scoredChunks.length === 0 && rerankEnabled) {
    console.log("No chunks found, trying again with rerank disabled");

    response = await client.retrievals.retrieve({
      partition,
      query,
      topK: isBreadth ? 30 : 6,
      rerank: false,
      recencyBias: prioritizeRecent,
      ...(isBreadth ? { maxChunksPerDocument: 4 } : {}),
    });

    console.log(`ragie response (rereank fallback) includes ${response.scoredChunks.length} chunk(s)`);
  }

  const chunks = JSON.stringify(response);

  const sources: SourceMetadata[] = response.scoredChunks.map((chunk) => {
    const documentName = chunk.documentName;
    let isVideo = false;
    let isAudio = false;
    if ("self_video_stream" in chunk.links) {
      isVideo = chunk.links.self_video_stream !== null;
    } else if ("self_audio_stream" in chunk.links) {
      isAudio = chunk.links.self_audio_stream !== null;
    }

    const streamUrl = isVideo
      ? chunk.links.self_video_stream?.href
      : isAudio
        ? chunk.links.self_audio_stream?.href
        : undefined;
    const downloadUrl = isVideo
      ? chunk.links.self_video_download?.href
      : isAudio
        ? chunk.links.self_audio_download?.href
        : undefined;
    const documentStreamUrl = isVideo
      ? chunk.links.document_video_stream?.href
      : isAudio
        ? chunk.links.document_audio_stream?.href
        : undefined;

    return {
      ...chunk.documentMetadata,
      source_type: chunk.documentMetadata.source_type,
      file_path: chunk.documentMetadata.file_path,
      source_url: chunk.documentMetadata.source_url,
      documentId: chunk.documentId,
      documentName,
      streamUrl,
      downloadUrl,
      documentStreamUrl,
      startTime: chunk.metadata?.start_time,
      endTime: chunk.metadata?.end_time,
    };
  });

  const company = { name: tenant.name };
  return {
    content: renderSystemPrompt({ company, chunks }, tenant.systemPrompt),
    sources,
  };
}

export type GroundingSystemPromptContext = {
  company: {
    name: string;
  };
};

export type SystemPromptContext = {
  company: {
    name: string;
  };
  chunks: string;
};

export function renderGroundingSystemPrompt(context: GroundingSystemPromptContext, prompt?: string | null) {
  const groundingPrompt = prompt ? prompt : DEFAULT_GROUNDING_PROMPT;

  const template = Handlebars.compile(groundingPrompt);

  const now = new Date().toISOString();
  return template({ ...context, now });
}

function renderSystemPrompt(context: SystemPromptContext, template?: string | null) {
  const compiled = Handlebars.compile(template ?? DEFAULT_SYSTEM_PROMPT);

  return compiled({ ...context });
}
