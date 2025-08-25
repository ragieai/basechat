import "highlight.js/styles/github.css";
import "./style.css";
import { FileAudio, FileImage, FileVideo, Copy, Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import CONNECTOR_MAP from "@/lib/connector-map";
import { IMAGE_FILE_TYPES, VIDEO_FILE_TYPES, AUDIO_FILE_TYPES } from "@/lib/file-utils";
import { LLM_DISPLAY_NAMES, LLMModel } from "@/lib/llm/types";

import { SourceMetadata } from "../../lib/types";
import Logo from "../tenant/logo/logo";

const MAX_CITATION_LENGTH = 30;

const Citation = ({ source, onClick = () => {} }: { source: SourceMetadata; onClick?: () => void }) => {
  const connector = CONNECTOR_MAP[source.source_type];
  const isAudio =
    source.documentName?.toLowerCase() &&
    AUDIO_FILE_TYPES.some((ext) => source.documentName?.toLowerCase().endsWith(ext));
  const isVideo =
    source.documentName?.toLowerCase() &&
    VIDEO_FILE_TYPES.some((ext) => source.documentName?.toLowerCase().endsWith(ext));
  const isImage =
    source.documentName?.toLowerCase() &&
    IMAGE_FILE_TYPES.some((ext) => source.documentName?.toLowerCase().endsWith(ext));

  const formatSourceName = (input: string) => {
    if (input.length <= MAX_CITATION_LENGTH) return input;
    return "..." + input.slice(-1 * MAX_CITATION_LENGTH);
  };

  return (
    <button className="rounded-[20px] flex items-center border px-3 py-1.5 mr-3 mb-3" onClick={onClick}>
      {connector && <Image src={connector[1]} alt={connector[0]} width={24} height={24} className="mr-1" />}
      {(!source.source_type || source.source_type === "manual") && (
        <>
          {isAudio && <FileAudio className="w-4 h-4 mr-1" />}
          {isVideo && <FileVideo className="w-4 h-4 mr-1" />}
          {isImage && <FileImage className="w-4 h-4 mr-1" />}
        </>
      )}
      {formatSourceName(source.documentName)}
    </button>
  );
};

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
  tenantId: string;
  content: string | undefined;
  id?: string | null;
  name: string;
  logoUrl?: string | null;
  sources: SourceMetadata[];
  onSelectedSource: (source: SourceMetadata) => void;
  model: LLMModel;
  isGenerating?: boolean;
}

export default function AssistantMessage({
  name,
  logoUrl,
  content,
  sources,
  onSelectedSource,
  model,
  isGenerating,
  tenantId,
}: Props) {
  return (
    <div className="flex">
      <div className="mb-8 shrink-0">
        <Logo
          name={name}
          url={logoUrl}
          width={40}
          height={40}
          className="text-[13px] h-[40px] w-[40px]"
          tenantId={tenantId}
        />
      </div>
      <div className="self-start mb-6 rounded-md ml-7 max-w-[calc(100%-60px)] bg-white p-4 border border-[#E5E7EB]">
        {content?.length ? (
          <Markdown
            className="markdown mt-[10px]"
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: CodeBlock,
            }}
          >
            {content}
          </Markdown>
        ) : (
          <div className="dot-pulse mt-[14px]" />
        )}
        <div className="flex flex-wrap mt-4">
          {sources.map((source, i) => (
            <Citation key={i} source={source} onClick={() => onSelectedSource(source)} />
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {isGenerating ? `Generating with ${LLM_DISPLAY_NAMES[model]}` : `Generated with ${LLM_DISPLAY_NAMES[model]}`}
        </div>
      </div>
    </div>
  );
}
