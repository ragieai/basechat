"use client";

import CitedRanges from "@/app/(main)/o/[slug]/conversations/[id]/cited-ranges";
import DocumentHeader from "@/app/(main)/o/[slug]/conversations/[id]/components/document-header";
import DocumentSummary from "@/app/(main)/o/[slug]/conversations/[id]/components/document-summary";
import MediaDisplay from "@/app/(main)/o/[slug]/conversations/[id]/components/media-display";
import { useAgenticSourceData } from "@/app/(main)/o/[slug]/conversations/[id]/hooks/use-agentic-source-data";
import { useMediaPlayer } from "@/app/(main)/o/[slug]/conversations/[id]/hooks/use-media-player";

export default function SourceDetails({ slug, sourceId, runId }: { slug: string; sourceId: string; runId: string }) {
  const { documentData, mediaData, isLoading, error, sourceMetadata } = useAgenticSourceData({
    runId,
    sourceId,
    slug,
  });

  // Use media player hook for proper state management
  const {
    videoRef,
    audioRef,
    state: mediaState,
    actions: mediaActions,
    handleCanPlay,
    handleLoadedMetadata,
    handleTimeUpdate,
  } = useMediaPlayer({
    mediaType: mediaData?.type || null,
    streamUrl: mediaData?.streamUrl,
    startTime: mediaData?.startTime,
    mergedTimeRanges: mediaData?.mergedTimeRanges,
    slug,
  });

  if (error) {
    return <div>{error}</div>;
  }

  if (isLoading || !documentData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <DocumentHeader documentData={documentData} slug={slug} />

      {mediaData && (
        <MediaDisplay
          mediaData={mediaData}
          state={mediaState}
          actions={mediaActions}
          videoRef={videoRef}
          audioRef={audioRef}
          slug={slug}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />
      )}

      <CitedRanges source={sourceMetadata} slug={slug} />

      <DocumentSummary summary={documentData.summary} />
    </div>
  );
}
