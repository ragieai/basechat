import { format } from "date-fns";
import Image from "next/image";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { Skeleton } from "@/components/ui/skeleton";
import CONNECTOR_MAP from "@/lib/connector-map";
import { cn } from "@/lib/utils";
import CloseIcon from "@/public/icons/close.svg";
import ExternalLinkIcon from "@/public/icons/external-link.svg";

import { DocumentResponse } from "./types";

interface Props {
  className?: string;
  documentId: string;
  onCloseClick: () => void;
}

export default function Summary({ className, documentId, onCloseClick = () => {} }: Props) {
  const [document, setDocument] = useState<DocumentResponse | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error("could not retrieve summary");

      const json = (await res.json()) as DocumentResponse;
      setDocument(json);
    })();
  }, [documentId]);

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
          {icon && <Image src={icon} alt="test" width={48} />}
          <div className="wrap text-[24px] font-bold mb-4 break-all">{document.name}</div>
          <div className="flex justify-between mb-6">
            <div className="text-[#74747A]">Updated {format(document.updatedAt, "MM/dd/yyyy")}</div>
            <a href={document.metadata.source_url} target="_blank" className="text-[#7749F8] flex">
              View in source
              <Image src={ExternalLinkIcon} alt="Open in new window" />
            </a>
          </div>
          <hr className="mb-6" />
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
