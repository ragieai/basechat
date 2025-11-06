import { useAgenticRetrieverContext } from "@/components/agentic-retriever/agentic-retriever-context";
import { getRagieSourcePath } from "@/lib/paths";
import { SourceMetadata } from "@/lib/types";

import { DocumentDisplayData, MediaDisplayData } from "../shared-types";

interface UseAgenticSourceDataProps {
  runId: string;
  sourceId: string;
  slug: string;
}

export function useAgenticSourceData({ runId, sourceId, slug }: UseAgenticSourceDataProps) {
  const agenticRetrival = useAgenticRetrieverContext();
  const source = agenticRetrival.getEvidence(runId, sourceId);

  if (!source || source.type !== "ragie") {
    return {
      documentData: null,
      mediaData: null,
      isLoading: false,
      error: "Source not found or not a ragie source",
    };
  }

  // Transform agentic source data to our display format
  const documentData: DocumentDisplayData = {
    name: source.document_name,
    summary: source.text.substring(source.document_name.length),
    updatedAt: source.document_metadata.document_uploaded_at
      ? new Date(source.document_metadata.document_uploaded_at * 1000).toISOString()
      : new Date().toISOString(),
    sourceUrl:
      source.document_metadata.source_url || getRagieSourcePath(slug, source.document_id, source.metadata.start_page),
    metadata: {
      source_type: source.document_metadata.source_type || "unknown",
      source_url: source.document_metadata.source_url || "#",
      _source_updated_at: source.document_metadata.document_uploaded_at,
    },
  };

  // Determine media type and prepare media data
  let mediaType: "audio" | "video" | "image" | null = null;
  const imageUrl = source.links.self_image?.href;
  const videoStreamUrl = source.links.self_video_stream?.href;
  const audioStreamUrl = source.links.self_audio_stream?.href;
  const documentVideoStreamUrl = source.links.document_video_stream?.href;
  const documentAudioStreamUrl = source.links.document_audio_stream?.href;
  const downloadUrl = source.links.self_video_download?.href || source.links.self_audio_download?.href;

  // Determine media type
  if (videoStreamUrl || documentVideoStreamUrl) {
    mediaType = "video";
  } else if (audioStreamUrl || documentAudioStreamUrl) {
    mediaType = "audio";
  } else if (imageUrl) {
    mediaType = "image";
  }

  // Use document stream URL (full document) when available, fallback to chunk stream for older messages
  const effectiveStreamUrl = documentVideoStreamUrl || documentAudioStreamUrl || videoStreamUrl || audioStreamUrl;

  const mediaData: MediaDisplayData = {
    type: mediaType,
    streamUrl: effectiveStreamUrl,
    imageUrl: imageUrl,
    downloadUrl: downloadUrl,
    startTime: source.metadata?.start_time,
    endTime: source.metadata?.end_time,
    mergedTimeRanges: source.metadata?.merged_time_ranges,
  };

  // Create SourceMetadata for CitedRanges component
  const sourceMetadata: SourceMetadata = {
    source_type: source.document_metadata.source_type || "unknown",
    file_path: source.document_metadata.file_path || "",
    source_url: source.document_metadata.source_url || "#",
    documentId: source.document_id,
    documentName: source.document_name,
    streamUrl: effectiveStreamUrl,
    downloadUrl: downloadUrl,
    imageUrl: imageUrl,
    startTime: source.metadata?.start_time,
    endTime: source.metadata?.end_time,
    startPage: source.metadata?.start_page,
    endPage: source.metadata?.end_page,
    mergedRanges: source.metadata?.merged_ranges,
    mergedTimeRanges: source.metadata?.merged_time_ranges,
  };

  return {
    documentData,
    mediaData,
    isLoading: false,
    error: null,
    sourceMetadata,
  };
}
