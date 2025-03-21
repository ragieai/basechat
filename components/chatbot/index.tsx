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

import AssistantMessage from "./assistant-message";
import ChatInput from "./chat-input";
import { SourceMetadata } from "./types";

const inter = Inter({ subsets: ["latin"] });

type AiMessage = { content: string; role: "assistant"; id?: string; sources: SourceMetadata[] };
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
  isPublic?: boolean;
  tenantSlug?: string;
}

export default function Chatbot({
  name,
  logoUrl,
  conversationId,
  initMessage,
  onSelectedDocumentId,
  isPublic,
  tenantSlug,
}: Props) {
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceMetadata[]>>({});
  const [pendingMessage, setPendingMessage] = useState<null | { id: string }>(null);

  const apiBase = isPublic ? `/api/public/${tenantSlug}/messages` : `/api/conversations/${conversationId}/messages`;

  const { isLoading, object, submit } = useObject({
    api: apiBase,
    schema: createConversationMessageResponseSchema,
    fetch: async function middleware(input: RequestInfo | URL, init?: RequestInit) {
      const res = await fetch(input, init);
      const id = res.headers.get("x-message-id");

      if (!isPublic) {
        assert(id);
        setPendingMessage({ id });
      } else {
        const tempId = `temp-${Date.now()}`;
        setPendingMessage({ id: tempId });
      }

      return res;
    },
    onError: console.error,
    onFinish: (event) => {
      if (!event.object) return;

      const content = event.object.message;
      setMessages((prev) => [...prev, { content: content, role: "assistant", sources: [] }]);
    },
  });

  const handleSubmit = (content: string) => {
    const payload: CreateConversationMessageRequest = { conversationId, content };
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
      const res = await fetch(`${apiBase}/${pendingMessage.id}`);
      if (!res.ok) return;

      const json = (await res.json()) as { id: string; sources: SourceMetadata[] };
      setSourceCache((prev) => ({ ...prev, [json.id]: json.sources }));
    })();
  }, [conversationId, pendingMessage, apiBase]);

  useEffect(() => {
    if (localInitMessage) {
      handleSubmit(localInitMessage);
      setLocalInitMessage(undefined);
    } else {
      (async () => {
        try {
          const res = await fetch(apiBase);
          if (!res.ok) {
            if (isPublic && res.status === 404) {
              // For public users, create a new conversation if one doesn't exist
              const createRes = await fetch(`/api/public/${tenantSlug}/conversations`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: "New Conversation" }),
              });
              if (!createRes.ok) throw new Error("Could not create conversation");
              // Now try loading messages again
              const messagesRes = await fetch(apiBase);
              if (!messagesRes.ok) throw new Error("Could not load conversation");
              const json = await messagesRes.json();
              const messages = conversationMessagesResponseSchema.parse(json);
              setMessages(messages);
            } else {
              throw new Error("Could not load conversation");
            }
          } else {
            const json = await res.json();
            const messages = conversationMessagesResponseSchema.parse(json);
            setMessages(messages);
          }
        } catch (error) {
          console.error("Error loading conversation:", error);
          // You might want to show an error message to the user here
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once
  }, [apiBase, isPublic, tenantSlug]);

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
