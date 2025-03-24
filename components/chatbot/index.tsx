"use client";

import assert from "assert";

import { experimental_useObject as useObject } from "ai/react";
import { Inter } from "next/font/google";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import {
  conversationMessagesResponseSchema,
  CreateConversationMessageRequest,
  createConversationMessageResponseSchema,
} from "@/lib/api";
import { LLMModel } from "@/lib/llm/types";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/llm/types";

import AssistantMessage from "./assistant-message";
import ChatInput from "./chat-input";
import { SourceMetadata } from "./types";

const inter = Inter({ subsets: ["latin"] });


type AiMessage = { content: string; role: "assistant"; id?: string; sources: SourceMetadata[]; model?: LLMModel };
type UserMessage = { content: string; role: "user" };
type SystemMessage = { content: string; role: "system" };
type Message = AiMessage | UserMessage | SystemMessage;

const UserMessage = ({ content }: { content: string }) => (
  <div className="mb-6 rounded-md px-4 py-2 self-end bg-[#F5F5F7]">{content}</div>
);

interface Props {
  conversationId: string;
  name: string;
  logoUrl?: string | null;
  initMessage?: string;
  onSelectedDocumentId: (id: string) => void;
}

export default function Chatbot({ name, logoUrl, conversationId, initMessage, onSelectedDocumentId }: Props) {
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceMetadata[]>>({});
  const [pendingMessage, setPendingMessage] = useState<null | { id: string }>(null);

  const { isLoading, object, submit } = useObject({
    api: `/api/conversations/${conversationId}/messages`,
    schema: createConversationMessageResponseSchema,
    fetch: async function middleware(input: RequestInfo | URL, init?: RequestInit) {
      const res = await fetch(input, init);
      const id = res.headers.get("x-message-id");

      assert(id);

      setPendingMessage({ id });
      return res;
    },
    onError: console.error,
    onFinish: (event) => {
      if (!event.object) return;

      const content = event.object.message;
      setMessages((prev) => [...prev, { content: content, role: "assistant", sources: [] }]);
    },
  });

  const handleSubmit = (content: string, model: LLMModel) => {
    const payload: CreateConversationMessageRequest = {
      conversationId,
      content,
      model,
      provider: DEFAULT_PROVIDER, // TODO: For now, we're only supporting OpenAI
    };
    setMessages([...messages, { content, role: "user" }]);
    submit(payload);
  };

  useEffect(() => {
    if (!pendingMessage || isLoading) return;

    const copy = [...messages];
    const last = copy.pop();
    if (last?.role === "assistant") {
      setMessages([...copy, { ...last, id: pendingMessage.id }]);
      setPendingMessage(null);
    }
  }, [pendingMessage, isLoading, messages]);

  useEffect(() => {
    if (!pendingMessage) return;

    (async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages/${pendingMessage.id}`);
      if (!res.ok) return;

      const json = (await res.json()) as { id: string; sources: SourceMetadata[] };
      setSourceCache((prev) => ({ ...prev, [json.id]: json.sources }));
    })();
  }, [conversationId, pendingMessage]);

  useEffect(() => {
    if (localInitMessage) {
      handleSubmit(localInitMessage, DEFAULT_MODEL); // TODO: make configuralbe?
      setLocalInitMessage(undefined);
    } else {
      (async () => {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!res.ok) throw new Error("Could not load conversation");
        const json = await res.json();
        const messages = conversationMessagesResponseSchema.parse(json);
        setMessages(messages);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once
  }, []);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    container.current?.scrollTo({
      top: container.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const messagesWithSources = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => (m.role === "assistant" && m.id && sourceCache[m.id] ? { ...m, sources: sourceCache[m.id] } : m)),
    [messages, sourceCache],
  );

  return (
    <div className="flex h-full w-full items-center flex-col">
      <div ref={container} className="flex flex-col h-full w-full items-center overflow-y-auto">
        <div className="flex flex-col h-full w-full p-4 max-w-[717px]">
          {messagesWithSources.map((message, i) =>
            message.role === "user" ? (
              <UserMessage key={i} content={message.content} />
            ) : (
              <Fragment key={i}>
                <AssistantMessage
                  name={name}
                  logoUrl={logoUrl}
                  content={message.content}
                  id={message.id}
                  sources={message.sources}
                  onSelectedDocumentId={onSelectedDocumentId}
                  model={message.model || DEFAULT_MODEL}
                />
              </Fragment>
            ),
          )}
          {isLoading && (
            <AssistantMessage
              name={name}
              logoUrl={logoUrl}
              content={object?.message}
              id={pendingMessage?.id}
              sources={[]}
              onSelectedDocumentId={onSelectedDocumentId}
              model={object?.model || DEFAULT_MODEL}
            />
          )}
        </div>
      </div>
      <div className="p-4 w-full flex justify-center max-w-[717px]">
        <div className="flex flex-col w-full p-2 pl-4 rounded-[24px] border border-[#D7D7D7]">
          <ChatInput handleSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
