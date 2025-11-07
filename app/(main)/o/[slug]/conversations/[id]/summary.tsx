import "highlight.js/styles/github.css";
import Image from "next/image";

import "@/components/chatbot/style.css";
import { Skeleton } from "@/components/ui/skeleton";
import { getRagieStreamPath } from "@/lib/paths";
import { SourceMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";
import CloseIcon from "@/public/icons/close.svg";

import CitedRanges from "./cited-ranges";
import DocumentHeader from "./components/document-header";
import DocumentSummary from "./components/document-summary";
import MediaDisplay from "./components/media-display";
import { useDocumentData } from "./hooks/use-document-data";
import { useMediaPlayer } from "./hooks/use-media-player";
import { MediaDisplayData } from "./shared-types";

interface Props {
  className?: string;
  source: SourceMetadata;
  slug: string;
  onCloseClick: () => void;
}

export default function Summary({ className, source, slug, onCloseClick = () => {} }: Props) {
  // Determine media type
  let mediaType: "audio" | "video" | "image" | null = null;
  if (source.streamUrl) {
    const streamUrl = new URL(source.streamUrl);
    if (streamUrl.searchParams.get("media_type")?.startsWith("video")) {
      mediaType = "video";
    } else if (streamUrl.searchParams.get("media_type")?.startsWith("audio")) {
      mediaType = "audio";
    }
  } else if (source.imageUrl) {
    mediaType = "image";
  }

  // Use custom hooks for data and media logic
  const { documentData, isLoading } = useDocumentData({
    documentId: source.documentId,
    slug,
    source: {
      streamUrl: source.streamUrl,
      downloadUrl: source.downloadUrl,
      imageUrl: source.imageUrl,
      startTime: source.startTime,
      endTime: source.endTime,
      mergedTimeRanges: source.mergedTimeRanges,
    },
  });

  // Use documentStreamUrl (full document) when available, fallback to streamUrl (chunk) for older messages
  const effectiveStreamUrl = source.documentStreamUrl || source.streamUrl;

  const {
    videoRef,
    audioRef,
    state: mediaState,
    actions: mediaActions,
    handleCanPlay,
    handleLoadedMetadata,
    handleTimeUpdate,
  } = useMediaPlayer({
    mediaType,
    streamUrl: effectiveStreamUrl,
    startTime: source.startTime,
    mergedTimeRanges: source.mergedTimeRanges,
    slug,
  });

  // Prepare media data
  const mediaData: MediaDisplayData = {
    type: mediaType,
    streamUrl: effectiveStreamUrl,
    imageUrl: source.imageUrl,
    downloadUrl: source.downloadUrl,
    startTime: source.startTime,
    endTime: source.endTime,
    mergedTimeRanges: source.mergedTimeRanges,
  };

  // Loading state
  if (isLoading || !documentData) {
    return (
      <div className={cn(className, "relative")}>
        <div className="absolute top-4 right-4">
          <Image className="cursor-pointer" src={CloseIcon} alt="Close" onClick={onCloseClick} />
        </div>
        <div className="flex flex-col justify-center items-center h-full w-full">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className="w-full flex flex-col">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-[85%] mb-7" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(className, "relative")}>
      <div className="absolute top-4 right-4">
        <Image className="cursor-pointer" src={CloseIcon} alt="Close" onClick={onCloseClick} />
      </div>

      <DocumentHeader
        documentData={documentData}
        downloadUrl={source.downloadUrl ? getRagieStreamPath(slug, source.downloadUrl) : undefined}
        mediaType={mediaType}
        slug={slug}
      />

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

      <CitedRanges source={source} slug={slug} />

      <DocumentSummary summary={documentData.summary} />
    </div>
  );
}
