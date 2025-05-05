import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { SourceMetadata } from "@/components/chatbot/types";
import { Skeleton } from "@/components/ui/skeleton";
import CONNECTOR_MAP from "@/lib/connector-map";
import { getRagieStreamPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import CloseIcon from "@/public/icons/close.svg";
import ExternalLinkIcon from "@/public/icons/external-link.svg";

import { DocumentResponse } from "./types";
interface Props {
  className?: string;
  source: SourceMetadata;
  slug: string;
  onCloseClick: () => void;
}

export default function Summary({ className, source, slug, onCloseClick = () => {} }: Props) {
  const [document, setDocument] = useState<DocumentResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${source.documentId}`, {
          headers: { tenant: slug },
        });

        if (!res.ok) {
          setDocument({
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
        setDocument(json);
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    })();
  }, [source.documentId, slug]);

  //TODO: support icons for more file types
  const icon =
    document?.metadata.source_type && CONNECTOR_MAP[document.metadata.source_type]
      ? CONNECTOR_MAP[document.metadata.source_type][1]
      : null;

  return (
    <div className={cn(className, "relative")}>
      <div className="absolute top-4 right-4">
        <Image className="cursor-pointer" src={CloseIcon} alt="Close" onClick={onCloseClick} />
      </div>
      {document ? (
        <>
          {icon && <Image src={icon} alt="source" width={48} />}
          <div className="wrap text-[24px] font-bold mb-4 break-all">{document.name}</div>
          <div className="flex justify-between mb-6">
            <div className="text-[#74747A]">Updated {format(document.updatedAt, "MM/dd/yyyy")}</div>
            {!source.streamUrl && (
              <a href={document.metadata.source_url} target="_blank" className="text-[#7749F8] flex">
                View in source
                <Image src={ExternalLinkIcon} alt="Open in new window" />
              </a>
            )}
          </div>
          <hr className="mb-6" />
          {source.streamUrl && (
            <div className="mb-6">
              <audio controls className="w-full" src={getRagieStreamPath(slug, source.streamUrl)}>
                Your browser does not support the audio element.
              </audio>
              {source.downloadUrl && (
                <a
                  href={getRagieStreamPath(slug, source.downloadUrl)}
                  download
                  target="_blank"
                  className="text-[#7749F8] flex items-center mt-2"
                >
                  Download audio
                  <Image src={ExternalLinkIcon} alt="Download" className="ml-1" />
                </a>
              )}
            </div>
          )}
          <div className="text-[12px] font-bold mb-4">Summary</div>
          <Markdown className="markdown">{document.summary}</Markdown>
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
