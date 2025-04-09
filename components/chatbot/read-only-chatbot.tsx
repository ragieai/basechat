"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { conversationMessagesResponseSchema } from "@/lib/api";
import { LLMModel } from "@/lib/llm/types";
import { getConversationMessages } from "@/lib/server/service";

import AssistantMessage from "./assistant-message";
import { SourceMetadata } from "./types";

// Infer the message type directly from the Zod schema
type Message = z.infer<typeof conversationMessagesResponseSchema>[number];

const UserMessageDisplay = ({ content }: { content: string }) => (
  <div className="mb-6 rounded-md px-4 py-2 self-end bg-[#F5F5F7]">{content}</div>
);

interface Props {
  conversationId: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
  };
  onSelectedDocumentId: (id: string) => void;
}

export default function ReadOnlyChatbot({ tenant, conversationId, onSelectedDocumentId }: Props) {
  // Use the inferred Message type for state
  const [messages, setMessages] = useState<Message[]>([]);
  const container = useRef<HTMLDivElement>(null);

  // Fetch messages on mount
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    (async () => {
      try {
        const res = await fetch(`/public/conversations/${conversationId}/messages`);
        console.log(res);
        if (!res.ok) {
          console.error("Could not load conversation:", res.statusText);
          if (isMounted) {
            setMessages([{ role: "system", content: "Error loading conversation.", id: "error-message" }]);
          }
          return;
        }
        const json = await res.json();
        const parsedMessages = conversationMessagesResponseSchema.parse(json);
        console.log(parsedMessages);
        if (isMounted) {
          setMessages(parsedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch or parse messages:", error);
        if (isMounted) {
          setMessages([{ role: "system", content: "Error loading conversation.", id: "error-message" }]);
        }
      }
    })();

    return () => {
      isMounted = false; // Cleanup function to set flag on unmount
    };
     
  }, [conversationId, tenant.slug]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    if (container.current) {
      // Use timeout to ensure scroll happens after render potentially completes
      setTimeout(() => {
        if (container.current) {
          container.current.scrollTop = container.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  return (
    <div className="flex h-full w-full items-center flex-col">
      <div ref={container} className="flex flex-col h-full w-full items-center overflow-y-auto pt-4 pb-4">
        <div className="flex flex-col h-auto w-full p-4 max-w-[717px]">
          {messages.map((message, i) => {
            // Use message ID as key if available, otherwise index
            const key = message.id || `msg-${i}`;

            if (message.role === "user") {
              return <UserMessageDisplay key={key} content={message.content} />;
            }

            if (message.role === "assistant") {
              return (
                <Fragment key={key}>
                  <AssistantMessage
                    name={tenant.name}
                    logoUrl={tenant.logoUrl}
                    content={message.content}
                    id={message.id}
                    sources={message.sources || []}
                    onSelectedDocumentId={onSelectedDocumentId}
                    model={message.model}
                    isGenerating={false}
                    tenantId={tenant.id}
                  />
                </Fragment>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
