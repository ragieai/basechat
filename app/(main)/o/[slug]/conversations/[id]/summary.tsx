import assert from "assert";

import "highlight.js/styles/github.css";
import { format } from "date-fns";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import "@/components/chatbot/style.css";
import { Skeleton } from "@/components/ui/skeleton";
import CONNECTOR_MAP from "@/lib/connector-map";
import { IMAGE_FILE_TYPES } from "@/lib/file-utils";
import { getRagieSourcePath, getRagieStreamPath } from "@/lib/paths";
import { SourceMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";
import CloseIcon from "@/public/icons/close.svg";
import ExternalLinkIcon from "@/public/icons/external-link.svg";

import CitedRanges from "./cited-ranges";
import PlayerControls from "./player-controls";
import { DocumentResponse } from "./types";

function MediaSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-[85%] mb-7" />
    </div>
  );
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children?: React.ReactNode;
}

interface ReactElement {
  props: {
    children?: React.ReactNode;
  };
}

const CodeBlock = ({ children, className, ...props }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const getCodeContent = (children: React.ReactNode): string => {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) {
      return children.map((child) => getCodeContent(child)).join("");
    }
    if (children && typeof children === "object" && "props" in children) {
      return getCodeContent((children as ReactElement).props.children);
    }
    return "";
  };

  const code = getCodeContent(children).replace(/\n$/, "");

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <pre className={className} {...props}>
      <div className="relative group">
        <code>{children}</code>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 rounded-md bg-gray-700/50 hover:bg-gray-700/70 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </pre>
  );
};

interface Props {
  className?: string;
  source: SourceMetadata;
  slug: string;
  onCloseClick: () => void;
}

export default function Summary({ className, source, slug, onCloseClick = () => {} }: Props) {
  const [documentData, setDocumentData] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [didInitialSeek, setDidInitialSeek] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setIsMediaLoaded(false);
    setDocumentData(null);

    (async () => {
      try {
        const res = await fetch(`/api/documents/${source.documentId}`, {
          headers: { tenant: slug },
        });

        if (!res.ok) {
          setDocumentData({
            name: "Document",
            metadata: {
              source_type: "unknown",
              source_url: "#",
            },
            updatedAt: new Date().toISOString(),
            summary: "Document summary not available",
          });
          throw new Error("could not retrieve document with summary");
        }

        const json = (await res.json()) as DocumentResponse;
        setDocumentData(json);
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [source.documentId, slug]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = videoRef.current || audioRef.current;
    if (media && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;

      // Pause the media before seeking to prevent race conditions
      const wasPlaying = !media.paused;
      if (wasPlaying) {
        media.pause();
      }

      media.currentTime = newTime;
      setCurrentTime(newTime);

      // Resume playback if it was playing before
      if (wasPlaying) {
        const playPromise = media.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Error resuming playback:", error);
          });
        }
      }
    }
  };

  const icon =
    documentData?.metadata.source_type && CONNECTOR_MAP[documentData.metadata.source_type]
      ? CONNECTOR_MAP[documentData.metadata.source_type][1]
      : null;

  let mediaType: null | "audio" | "video" | "image" = null;
  if (source.streamUrl) {
    const streamUrl = new URL(source.streamUrl);
    if (streamUrl.searchParams.get("media_type")?.startsWith("video")) {
      mediaType = "video";
    } else if (streamUrl.searchParams.get("media_type")?.startsWith("audio")) {
      mediaType = "audio";
    }
  } else if (source.imageUrl) {
    mediaType = "image";
  } else if (source.documentName && IMAGE_FILE_TYPES.some((ext) => source.documentName!.toLowerCase().endsWith(ext))) {
    // Detect image files by extension even without imageUrl
    mediaType = "image";
  }

  // Add effect to ensure progress bar updates after drag
  useEffect(() => {
    if (!isDragging) {
      const media = videoRef.current || audioRef.current;
      if (media && !media.paused) {
        const updateProgress = () => {
          if (media) {
            setCurrentTime(media.currentTime);
            animationFrameRef.current = requestAnimationFrame(updateProgress);
          }
        };
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging]);

  // Add effect to ensure progress bar updates after drag
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

  let sourceUrl = documentData.metadata.source_url;
  if (!sourceUrl && source.ragieSourceUrl) {
    sourceUrl = getRagieSourcePath(slug, source.ragieSourceUrl);
  }

  return (
    <div className={cn(className, "relative")}>
      <div className="absolute top-4 right-4">
        <Image className="cursor-pointer" src={CloseIcon} alt="Close" onClick={onCloseClick} />
      </div>
      {icon && <Image src={icon} alt="source" width={48} />}
      <div className="wrap text-[24px] font-bold mb-4 break-all">{documentData.name}</div>
      <div className="flex justify-between mb-6">
        <div className="text-[#74747A]">Updated {format(documentData.updatedAt, "MM/dd/yyyy")}</div>
        {!source.streamUrl && (
          <a href={sourceUrl} target="_blank" className="text-[#7749F8] flex">
            View in source
            <Image src={ExternalLinkIcon} alt="Open in new window" />
          </a>
        )}
        {source.downloadUrl && (
          <a
            href={getRagieStreamPath(slug, source.downloadUrl)}
            download
            target="_blank"
            className="text-[#7749F8] flex items-center mt-2"
          >
            Download {mediaType}
            <Image src={ExternalLinkIcon} alt="Download" className="ml-1" />
          </a>
        )}
      </div>
      <hr className="mb-6" />
      {source.streamUrl && (
        <div className="mb-6">
          {(() => {
            if (mediaType === "audio") {
              return (
                <div className="flex flex-col">
                  <audio
                    ref={audioRef}
                    className="w-full"
                    src={getRagieStreamPath(slug, source.streamUrl)}
                    controls={false}
                    preload="metadata"
                    onCanPlay={() => {
                      assert(audioRef.current, "audioRef not loaded");
                      // Use the first time range from mergedTimeRanges if available, otherwise fall back to startTime
                      const seekTime =
                        source.mergedTimeRanges && source.mergedTimeRanges.length > 0
                          ? source.mergedTimeRanges[0].startTime
                          : source.startTime;
                      const canSeek = audioRef.current.seekable.end(0) >= seekTime!;
                      if (canSeek && !didInitialSeek) {
                        audioRef.current.currentTime = seekTime || 0;
                        setCurrentTime(seekTime || 0);
                        setDidInitialSeek(true);
                      }
                    }}
                    onLoadedMetadata={() => {
                      assert(audioRef.current, "audioRef not loaded");
                      setDuration(audioRef.current.duration);
                      setIsMediaLoaded(true);
                    }}
                    onLoadedData={() => {
                      assert(audioRef.current, "audioRef not loaded");
                      setDuration(audioRef.current.duration);
                      setIsMediaLoaded(true);
                    }}
                    onDurationChange={() => {
                      assert(audioRef.current, "audioRef not loaded");
                      setDuration(audioRef.current.duration);
                      setIsMediaLoaded(true);
                    }}
                    onTimeUpdate={() => {
                      assert(audioRef.current, "audioRef not loaded");
                      setCurrentTime(audioRef.current.currentTime);
                    }}
                  />
                  {isMediaLoaded ? (
                    <PlayerControls
                      isPlaying={isPlaying}
                      isMuted={isMuted}
                      currentTime={currentTime}
                      duration={duration}
                      onProgressClick={handleProgressClick}
                      onPlayPause={() => {
                        assert(audioRef.current, "audioRef not loaded");
                        if (audioRef.current.paused) {
                          audioRef.current.play();
                          setIsPlaying(true);
                        } else {
                          audioRef.current.pause();
                          setIsPlaying(false);
                        }
                      }}
                      onMute={() => {
                        assert(audioRef.current, "audioRef not loaded");
                        audioRef.current.muted = !audioRef.current.muted;
                        setIsMuted(!isMuted);
                      }}
                      onForward={() => {
                        assert(audioRef.current, "audioRef not loaded");
                        const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
                        audioRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      onReplay={() => {
                        assert(audioRef.current, "audioRef not loaded");
                        const newTime = Math.max(0, audioRef.current.currentTime - 10);
                        audioRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      onFullscreen={() => {}}
                      onDragStateChange={setIsDragging}
                    />
                  ) : (
                    <MediaSkeleton />
                  )}
                </div>
              );
            }

            if (mediaType === "video") {
              // Some very early messages with video chunk will not have documentStreamUrl
              // In that case, we fallback to streamUrl
              const chunkStreamFallback = !source.documentStreamUrl;
              const streamUrl = chunkStreamFallback ? source.streamUrl : source.documentStreamUrl;
              assert(streamUrl, "documentStreamUrl not available");
              return (
                <div className="flex flex-col">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg"
                    src={getRagieStreamPath(slug, streamUrl)}
                    controls={false}
                    onCanPlay={() => {
                      assert(videoRef.current, "videoRef not loaded");
                      // Use the first time range from mergedTimeRanges if available, otherwise fall back to startTime
                      const seekTime =
                        source.mergedTimeRanges && source.mergedTimeRanges.length > 0
                          ? source.mergedTimeRanges[0].startTime
                          : source.startTime;
                      const canSeek = videoRef.current.seekable.end(0) >= seekTime!;
                      if (canSeek && !didInitialSeek && !chunkStreamFallback) {
                        videoRef.current.currentTime = seekTime || 0;
                        setCurrentTime(seekTime || 0);
                        setDidInitialSeek(true);
                      }
                    }}
                    onLoadedMetadata={() => {
                      assert(videoRef.current, "videoRef not loaded");
                      setDuration(videoRef.current.duration);
                      setIsMediaLoaded(true);
                    }}
                    onLoadedData={() => {
                      assert(videoRef.current, "videoRef not loaded");
                      setDuration(videoRef.current.duration);
                      setIsMediaLoaded(true);
                    }}
                    onTimeUpdate={() => {
                      assert(videoRef.current, "videoRef not loaded");
                      if (videoRef.current.currentTime !== currentTime) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                  />
                  {isMediaLoaded && duration > 0 ? (
                    <PlayerControls
                      isPlaying={isPlaying}
                      isMuted={isMuted}
                      currentTime={currentTime}
                      duration={duration}
                      onProgressClick={handleProgressClick}
                      onPlayPause={() => {
                        assert(videoRef.current, "videoRef not loaded");
                        if (videoRef.current.paused) {
                          videoRef.current.play();
                          setIsPlaying(true);
                        } else {
                          videoRef.current.pause();
                          setIsPlaying(false);
                        }
                      }}
                      onMute={() => {
                        assert(videoRef.current, "videoRef not loaded");
                        videoRef.current.muted = !videoRef.current.muted;
                        setIsMuted(!isMuted);
                      }}
                      onForward={() => {
                        assert(videoRef.current, "videoRef not loaded");
                        const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                        videoRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      onReplay={() => {
                        assert(videoRef.current, "videoRef not loaded");
                        const newTime = Math.max(0, videoRef.current.currentTime - 10);
                        videoRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      onFullscreen={() => {
                        assert(videoRef.current, "videoRef not loaded");
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          videoRef.current.requestFullscreen();
                        }
                      }}
                      onDragStateChange={setIsDragging}
                    />
                  ) : (
                    <MediaSkeleton />
                  )}
                </div>
              );
            }

            return null;
          })()}
        </div>
      )}
      {mediaType === "image" && (
        <div className="mb-6">
          <img
            src={getRagieSourcePath(slug, source.imageUrl || source.ragieSourceUrl || "")}
            alt={source.documentName || "Image"}
            className="w-full h-auto rounded-md max-w-md"
          />
        </div>
      )}

      <CitedRanges source={source} slug={slug} />

      <div className="text-[12px] font-bold my-4">Summary</div>
      <Markdown
        className="markdown"
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: CodeBlock,
        }}
      >
        {documentData.summary}
      </Markdown>
    </div>
  );
}
