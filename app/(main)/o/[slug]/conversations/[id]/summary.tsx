import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import Markdown from "react-markdown";

import { SourceMetadata } from "@/components/chatbot/types";
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
interface Props {
  className?: string;
  source: SourceMetadata;
  slug: string;
  onCloseClick: () => void;
}

export default function Summary({ className, source, slug, onCloseClick = () => {} }: Props) {
  const [documentData, setDocumentData] = useState<DocumentResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
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
      }
    })();
  }, [source.documentId, slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleEnded = () => {
        setIsPlaying(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };

      const handleLoadedData = () => {
        setDuration(video.duration);
      };

      video.addEventListener("ended", handleEnded);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("loadeddata", handleLoadedData);

      // If video is already loaded, set duration
      if (video.readyState >= 2) {
        setDuration(video.duration);
        console.log("Video already loaded, duration:", video.duration);
      }

      return () => {
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  //TODO: support icons for more file types
  const icon =
    documentData?.metadata.source_type && CONNECTOR_MAP[documentData.metadata.source_type]
      ? CONNECTOR_MAP[documentData.metadata.source_type][1]
      : null;

  return (
    <div className={cn(className, "relative")}>
      <div className="absolute top-4 right-4">
        <Image className="cursor-pointer" src={CloseIcon} alt="Close" onClick={onCloseClick} />
      </div>
      {documentData ? (
        <>
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
                const isAudio = source.documentName?.toLowerCase().endsWith(".mp3");
                const isVideo = source.documentName?.toLowerCase().endsWith(".mp4");

                if (isAudio) {
                  return (
                    <audio controls className="w-full" src={getRagieStreamPath(slug, source.streamUrl)}>
                      Your browser does not support the audio element.
                    </audio>
                  );
                }

                if (isVideo) {
                  return (
                    <div className="flex flex-col">
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg"
                        src={getRagieStreamPath(slug, source.streamUrl)}
                        controls={false}
                      />
                      <div className="mt-2 px-2">
                        <div
                          className="h-1 bg-gray-200 rounded-full cursor-pointer relative"
                          onClick={handleProgressClick}
                        >
                          <div
                            className="h-full bg-[#7749F8] rounded-full"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-black rounded-sm"
                            style={{ left: `${(currentTime / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 mt-4">
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.muted = !videoRef.current.muted;
                              setIsMuted(!isMuted);
                            }
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                        >
                          <Image
                            src={VolumeUpIcon}
                            alt={isMuted ? "Unmute" : "Mute"}
                            width={32}
                            height={32}
                            className={cn(isMuted && "opacity-50")}
                          />
                        </button>
                        <div className="flex items-center gap-0">
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                const newTime = Math.max(0, videoRef.current.currentTime - 10);
                                videoRef.current.currentTime = newTime;
                                setCurrentTime(newTime);
                              }
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                          >
                            <Image src={Replay10Icon} alt="Replay 10 seconds" width={32} height={32} />
                          </button>
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                if (videoRef.current.paused) {
                                  videoRef.current.play();
                                  setIsPlaying(true);
                                } else {
                                  videoRef.current.pause();
                                  setIsPlaying(false);
                                }
                              }
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                          >
                            <Image
                              src={isPlaying ? PauseIcon : PlayIcon}
                              alt={isPlaying ? "Pause" : "Play"}
                              width={48}
                              height={48}
                            />
                          </button>
                          <button
                            onClick={() => {
                              if (videoRef.current) {
                                const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                                videoRef.current.currentTime = newTime;
                                setCurrentTime(newTime);
                              }
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                          >
                            <Image src={Forward10Icon} alt="Forward 10 seconds" width={32} height={32} />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (document.fullscreenElement) {
                                document.exitFullscreen();
                                setIsFullscreen(false);
                              } else {
                                videoRef.current.requestFullscreen();
                                setIsFullscreen(true);
                              }
                            }
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                        >
                          <Image
                            src={FullScreenIcon}
                            alt={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                            width={32}
                            height={32}
                          />
                        </button>
                      </div>
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
                  Download {source.documentName?.toLowerCase().endsWith(".mp4") ? "video" : "audio"}
                  <Image src={ExternalLinkIcon} alt="Download" className="ml-1" />
                </a>
              )}
            </div>
          )}
          <div className="text-[12px] font-bold mb-4">Summary</div>
          <Markdown className="markdown">{documentData.summary}</Markdown>
        </>
      ) : (
        <div className="flex flex-col justify-center items-center h-full w-full">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className="w-full flex flex-col">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-[85%] mb-7" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
