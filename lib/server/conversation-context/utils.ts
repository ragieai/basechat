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

    const imageUrl = chunk.links.self_image?.href ?? undefined;

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
      imageUrl,
      startPage: chunk.metadata?.start_page,
      endPage: chunk.metadata?.end_page,
    };
  });

  // Deduplicate sources by documentId and merge contiguous ranges
  const groupedByDocument = sources.reduce<Record<string, SourceMetadata[]>>((acc, source) => {
    if (!acc[source.documentId]) {
      acc[source.documentId] = [];
    }
    acc[source.documentId].push(source);
    return acc;
  }, {});

  const dedupedSources: SourceMetadata[] = Object.entries(groupedByDocument).map(([documentId, sources]) => {
    // Extract all page ranges from sources
    const pageRanges: { startPage: number; endPage: number }[] = [];

    sources.forEach((source) => {
      if (
        source.startPage &&
        source.endPage &&
        typeof source.startPage === "number" &&
        typeof source.endPage === "number"
      ) {
        pageRanges.push({ startPage: source.startPage, endPage: source.endPage });
      }
    });

    // Sort page ranges by startPage
    pageRanges.sort((a, b) => a.startPage - b.startPage);

    // Merge contiguous page ranges
    const mergedRanges: { startPage: number; endPage: number }[] = [];
    let currentRange: { startPage: number; endPage: number } | null = null;

    pageRanges.forEach((range) => {
      if (!currentRange) {
        currentRange = { ...range };
      } else if (currentRange.endPage + 1 >= range.startPage) {
        // Ranges are contiguous or overlapping, merge them
        currentRange.endPage = Math.max(currentRange.endPage, range.endPage);
      } else {
        // Ranges are not contiguous, start a new range
        mergedRanges.push(currentRange);
        currentRange = { ...range };
      }
    });

    if (currentRange) {
      mergedRanges.push(currentRange);
    }

    // Extract all time ranges from sources
    const timeRanges: { startTime: number; endTime: number }[] = [];

    sources.forEach((source) => {
      if (
        source.startTime &&
        source.endTime &&
        typeof source.startTime === "number" &&
        typeof source.endTime === "number"
      ) {
        timeRanges.push({ startTime: source.startTime, endTime: source.endTime });
      }
    });

    // Sort time ranges by startTime
    timeRanges.sort((a, b) => a.startTime - b.startTime);

    // Merge contiguous time ranges
    const mergedTimeRanges: { startTime: number; endTime: number }[] = [];
    let currentTimeRange: { startTime: number; endTime: number } | null = null;

    timeRanges.forEach((range) => {
      if (!currentTimeRange) {
        currentTimeRange = { ...range };
      } else if (currentTimeRange.endTime >= range.startTime) {
        // Ranges are contiguous or overlapping, merge them
        currentTimeRange.endTime = Math.max(currentTimeRange.endTime, range.endTime);
      } else {
        // Ranges are not contiguous, start a new range
        mergedTimeRanges.push(currentTimeRange);
        currentTimeRange = { ...range };
      }
    });

    if (currentTimeRange) {
      mergedTimeRanges.push(currentTimeRange);
    }

    // Create the merged source with all other properties from the first source
    const baseSource = sources[0];
    const mergedSource: SourceMetadata = {
      ...baseSource,
      startPage: mergedRanges.length > 0 ? mergedRanges[0].startPage : baseSource.startPage,
      endPage: mergedRanges.length > 0 ? mergedRanges[mergedRanges.length - 1].endPage : baseSource.endPage,
      startTime: mergedTimeRanges.length > 0 ? mergedTimeRanges[0].startTime : baseSource.startTime,
      endTime: mergedTimeRanges.length > 0 ? mergedTimeRanges[mergedTimeRanges.length - 1].endTime : baseSource.endTime,
    };

    // Store the merged ranges for display
    mergedSource.mergedRanges = mergedRanges;
    mergedSource.mergedTimeRanges = mergedTimeRanges;

    return mergedSource;
  });

  const company = { name: tenant.name };
  return {
    content: renderSystemPrompt({ company, chunks }, tenant.systemPrompt),
    sources: dedupedSources,
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
