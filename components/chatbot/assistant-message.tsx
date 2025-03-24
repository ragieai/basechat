import Image from "next/image";

import "./style.css";
import CONNECTOR_MAP from "@/lib/connector-map";
import { LLMModel } from "@/lib/llm/types";

import Logo from "../tenant/logo/logo";

import { SourceMetadata } from "./types";

const MAX_CITATION_LENGTH = 30;

const Citation = ({ source, onClick = () => {} }: { source: SourceMetadata; onClick?: () => void }) => {
  const connector = CONNECTOR_MAP[source.source_type];

  const formatSourceName = (input: string) => {
    if (input.length <= MAX_CITATION_LENGTH) return input;
    return "..." + input.slice(-1 * MAX_CITATION_LENGTH);
  };

  return (
    <button className="rounded-[20px] flex items-center border px-3 py-1.5 mr-3 mb-3" onClick={onClick}>
      {connector && <Image src={connector[1]} alt={connector[0]} className="mr-1" />}
      {formatSourceName(source.documentName)}
    </button>
  );
};

interface Props {
  content: string | undefined;
  id?: string | null;
  name: string;
  logoUrl?: string | null;
  sources: SourceMetadata[];
  onSelectedDocumentId: (id: string) => void;
  model: LLMModel;
}

export default function AssistantMessage({ name, logoUrl, content, sources, onSelectedDocumentId, model }: Props) {
  const dedupe = sources.reduce<Record<string, SourceMetadata>>((acc, v) => {
    acc[v.documentId] = v;
    return acc;
  }, {});

  const dedupedSources = Object.values(dedupe);

  return (
    <div className="flex">
      <div className="mb-8 shrink-0">
        <Logo name={name} url={logoUrl} width={40} height={40} className="avatar text-[13px] h-[40px] w-[40px]" />
      </div>
      <div className="self-start mb-6 rounded-md ml-7">
        {content?.length ? content : <div className="dot-pulse mt-1.5" />}
        <div className="flex flex-wrap mt-4">
          {dedupedSources.map((source, i) => (
            <Citation key={i} source={source} onClick={() => onSelectedDocumentId(source.documentId)} />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">Generated with {model}</div>
      </div>
    </div>
  );
}
