import assert from "assert";

import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback, useReducer } from "react";
import Markdown from "react-markdown";

import { Skeleton } from "@/components/ui/skeleton";
import CONNECTOR_MAP from "@/lib/connector-map";
import { getRagieStreamPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import CloseIcon from "@/public/icons/close.svg";
import ExternalLinkIcon from "@/public/icons/external-link.svg";
import Forward10Icon from "@/public/icons/forward_10.svg";
import FullScreenIcon from "@/public/icons/full_screen.svg";
import PauseIcon from "@/public/icons/pause.svg";
import PlayIcon from "@/public/icons/play.svg";
import Replay10Icon from "@/public/icons/replay_10.svg";
import VolumeUpIcon from "@/public/icons/volume_up.svg";

import { DocumentResponse } from "./types";

import { SourceMetadata } from "@/lib/types";
interface PlayerControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPlayPause: () => void;
  onMute: () => void;
  onForward: () => void;
  onReplay: () => void;
  onFullscreen: () => void;
  onDragStateChange: (isDragging: boolean) => void;
}

type DragState = {
  isDragging: boolean;
  previewTime: number | null;
};

type DragAction =
  | { type: "START_DRAG"; time: number }
  | { type: "UPDATE_PREVIEW"; time: number }
  | { type: "END_DRAG" };

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case "START_DRAG":
      return { isDragging: true, previewTime: action.time };
    case "UPDATE_PREVIEW":
      return { ...state, previewTime: action.time };
    case "END_DRAG":
      return { isDragging: false, previewTime: null };
    default:
      return state;
  }
}

function PlayerControls({
  isPlaying,
  isMuted,
  currentTime,
  duration,
  onProgressClick,
  onPlayPause,
  onMute,
  onForward,
  onReplay,
  onFullscreen,
  onDragStateChange,
}: PlayerControlsProps) {
  const [dragState, dispatch] = useReducer(dragReducer, { isDragging: false, previewTime: null });
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<{
    handleDragOver: (e: DragEvent) => void;
    handleDocumentDrop: (e: DragEvent) => void;
    handleDocumentDragEnd: () => void;
  } | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateNewTime = (clientX: number): number => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return currentTime;

    // Calculate position relative to the progress bar
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percent = relativeX / rect.width;
    return Math.max(0, Math.min(duration, percent * duration));
  };

  const cleanupDrag = useCallback(() => {
    dispatch({ type: "END_DRAG" });
    if (eventHandlersRef.current) {
      document.removeEventListener("dragover", eventHandlersRef.current.handleDragOver);
      document.removeEventListener("drop", eventHandlersRef.current.handleDocumentDrop);
      document.removeEventListener("dragend", eventHandlersRef.current.handleDocumentDragEnd);
    }
  }, []);

  // Initialize event handlers
  useEffect(() => {
    eventHandlersRef.current = {
      handleDragOver: (e: DragEvent) => {
        e.preventDefault();
        if (!dragState.isDragging || !progressBarRef.current) return;
        const newTime = calculateNewTime(e.clientX);
        dispatch({ type: "UPDATE_PREVIEW", time: newTime });
      },
      handleDocumentDrop: (e: DragEvent) => {
        e.preventDefault();
        if (!dragState.isDragging) return;
        onProgressClick({
          clientX: e.clientX,
          currentTarget: progressBarRef.current,
        } as React.MouseEvent<HTMLDivElement>);
        cleanupDrag();
      },
      handleDocumentDragEnd: () => {
        cleanupDrag();
      },
    };
  }, [dragState.isDragging, onProgressClick, cleanupDrag]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("text/plain", ""); // Required for Firefox
      e.dataTransfer.effectAllowed = "move";

      const rect = progressBarRef.current?.getBoundingClientRect();
      if (rect && eventHandlersRef.current) {
        // Clean up any existing listeners before adding new ones
        cleanupDrag();

        dispatch({ type: "START_DRAG", time: currentTime });
        onDragStateChange(true);

        // Add event listeners for drag outside the window
        document.addEventListener("dragover", eventHandlersRef.current.handleDragOver);
        document.addEventListener("drop", eventHandlersRef.current.handleDocumentDrop);
        document.addEventListener("dragend", eventHandlersRef.current.handleDocumentDragEnd);
      }
    },
    [currentTime, cleanupDrag, onDragStateChange],
  );

  const handleDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!dragState.isDragging || !progressBarRef.current) return;

      // Update immediately for better responsiveness
      const newTime = calculateNewTime(e.clientX);
      dispatch({ type: "UPDATE_PREVIEW", time: newTime });
    },
    [dragState.isDragging],
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!dragState.isDragging) return;

      onProgressClick({
        clientX: e.clientX,
        currentTarget: progressBarRef.current,
      } as React.MouseEvent<HTMLDivElement>);
      onDragStateChange(false);
      cleanupDrag();
    },
    [dragState.isDragging, onProgressClick, cleanupDrag, onDragStateChange],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      cleanupDrag();
      onDragStateChange(false);
    };
  }, [cleanupDrag, onDragStateChange]);

  // Add cleanup on component update
  useEffect(() => {
    return () => {
      cleanupDrag();
      onDragStateChange(false);
    };
  }, [cleanupDrag, onDragStateChange]);

  const currentProgress = dragState.previewTime !== null ? dragState.previewTime : currentTime;
  const progressPercent = (currentProgress / duration) * 100;

  return (
    <div className="flex flex-col">
      <div className="mt-4 px-2">
        <div
          ref={progressBarRef}
          className={cn(
            "h-1 bg-gray-200 rounded-full cursor-pointer relative transition-colors duration-200",
            dragState.isDragging && "bg-gray-300",
          )}
          onClick={onProgressClick}
        >
          <div
            className={cn(
              "h-full bg-[#7749F8] rounded-full transition-all duration-200",
              dragState.isDragging && "opacity-80",
            )}
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-black rounded-sm cursor-grab active:cursor-grabbing transition-all duration-200",
              dragState.isDragging && "h-4 w-1.5 bg-[#7749F8]",
            )}
            style={{ left: `${progressPercent}%`, transform: "translate(-50%, -50%)" }}
            draggable="true"
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{formatTime(currentProgress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <button onClick={onMute} className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200">
          <Image
            src={VolumeUpIcon}
            alt={isMuted ? "Unmute" : "Mute"}
            width={32}
            height={32}
            className={cn(isMuted && "opacity-50")}
          />
        </button>
        <div className="flex items-center gap-0">
          <button onClick={onReplay} className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200">
            <Image src={Replay10Icon} alt="Replay 10 seconds" width={32} height={32} />
          </button>
          <button onClick={onPlayPause} className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200">
            <Image src={isPlaying ? PauseIcon : PlayIcon} alt={isPlaying ? "Pause" : "Play"} width={48} height={48} />
          </button>
          <button onClick={onForward} className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200">
            <Image src={Forward10Icon} alt="Forward 10 seconds" width={32} height={32} />
          </button>
        </div>
        <button onClick={onFullscreen} className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200">
          <Image src={FullScreenIcon} alt={"Toggle fullscreen"} width={32} height={32} />
        </button>
      </div>
    </div>
  );
}

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

  let mediaType: null | "audio" | "video" = null;
  if (source.streamUrl) {
    const streamUrl = new URL(source.streamUrl);
    if (streamUrl.searchParams.get("media_type")?.startsWith("video")) {
      mediaType = "video";
    } else if (streamUrl.searchParams.get("media_type")?.startsWith("audio")) {
      mediaType = "audio";
    }
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
          <a href={documentData.metadata.source_url} target="_blank" className="text-[#7749F8] flex">
            View in source
            <Image src={ExternalLinkIcon} alt="Open in new window" />
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
                  {isMediaLoaded && (
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
                      const canSeek = videoRef.current.seekable.end(0) >= source.startTime!;
                      if (canSeek && !didInitialSeek && !chunkStreamFallback) {
                        videoRef.current.currentTime = source.startTime || 0;
                        setCurrentTime(source.startTime || 0);
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
                  {isMediaLoaded && duration > 0 && (
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
                  )}
                </div>
              );
            }

            return null;
          })()}
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
      )}
      <div className="text-[12px] font-bold mb-4">Summary</div>
      <Markdown className="markdown">{documentData.summary}</Markdown>
    </div>
  );
}
