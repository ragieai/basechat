"use client";

import assert from "assert";

import { experimental_useObject as useObject } from "ai/react";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import PrimaryButton from "@/components/primary-button";
import { ShareButton } from "@/components/share-button";
import {
  conversationMessagesResponseSchema,
  CreateConversationMessageRequest,
  createConversationMessageResponseSchema,
} from "@/lib/api";

import AssistantMessage from "./assistant-message";
import ChatInput from "./chat-input";
import { SourceMetadata } from "./types";

const inter = Inter({ subsets: ["latin"] });

type AiMessage = { content: string; role: "assistant"; id?: string; expanded: boolean; sources: SourceMetadata[] };
type UserMessage = { content: string; role: "user" };
type SystemMessage = { content: string; role: "system" };
type Message = AiMessage | UserMessage | SystemMessage;

const UserMessage = ({ content }: { content: string }) => (
  <div className="mb-6 rounded-md px-4 py-2 self-end bg-[#F5F5F7]">{content}</div>
);

interface Props {
  conversationId: string;
  name: string;
  initMessage?: string;
  onSelectedDocumentId: (id: string) => void;
  readOnly?: boolean;
  messages?: any[];
}

function isExpandable(messages: Message[], i: number) {
  return (
    i === messages.length - 1 &&
    (messages.length <= 2 ||
      (messages.length - 2 > 0 && messages[messages.length - 2].content != "Tell me more about this"))
  );
}

export default function Chatbot({
  name,
  conversationId,
  initMessage,
  onSelectedDocumentId,
  readOnly = false,
  messages: initialMessages,
}: Props) {
  const router = useRouter();
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceMetadata[]>>({});
  const [pendingMessage, setPendingMessage] = useState<null | { id: string; expanded: boolean }>(null);

  const { isLoading, object, submit } = useObject({
    api: `/api/conversations/${conversationId}/messages`,
    schema: createConversationMessageResponseSchema,
    fetch: async function middleware(input: RequestInfo | URL, init?: RequestInit) {
      const res = await fetch(input, init);
      const id = res.headers.get("x-message-id");
      const expanded = res.headers.get("x-expanded") ? true : false;

      assert(id);

      setPendingMessage({ id, expanded });
      return res;
    },
    onError: console.error,
    onFinish: (event) => {
      if (!event.object) return;

      const content = event.object.message;
      setMessages((prev) => [...prev, { content: content, role: "assistant", sources: [], expanded: false }]);
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
      setMessages([...copy, { ...last, id: pendingMessage.id, expanded: pendingMessage.expanded }]);
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
      handleSubmit(localInitMessage);
      setLocalInitMessage(undefined);
    } else if (!readOnly || !initialMessages) {
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

  const handleContinueConversation = async () => {
    try {
      // Create a new conversation with the same messages
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Continued from ${name}`,
          messages: messages.map(({ content, role }) => ({ content, role })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const { id } = await response.json();
      router.push(`/conversations/${id}`);
    } catch (error) {
      console.error("Failed to continue conversation:", error);
    }
  };

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
                  content={message.content}
                  id={message.id}
                  sources={message.sources}
                  onSelectedDocumentId={onSelectedDocumentId}
                />
                {isExpandable(messagesWithSources, i) && !readOnly && (
                  <div className="flex justify-center">
                    <button
                      className="flex justify-center rounded-[20px] border px-4 py-2.5 mt-8"
                      onClick={() => handleSubmit("Tell me more about this")}
                    >
                      Tell me more about this
                    </button>
                  </div>
                )}
              </Fragment>
            ),
          )}
          {isLoading && (
            <AssistantMessage
              name={name}
              content={object?.message}
              id={pendingMessage?.id}
              sources={[]}
              onSelectedDocumentId={onSelectedDocumentId}
            />
          )}
          {readOnly && (
            <div className="flex justify-center mt-8">
              <PrimaryButton onClick={handleContinueConversation}>Continue Conversation</PrimaryButton>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 w-full flex justify-center max-w-[717px]">
        <div className="flex flex-col w-full p-2 pl-4 rounded-[24px] border border-[#D7D7D7]">
          {!readOnly && (
            <div className="flex gap-2 items-center">
              <ShareButton conversationId={conversationId} />
              <div className="flex-1">
                <ChatInput handleSubmit={handleSubmit} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
