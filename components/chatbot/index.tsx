"use client";

import assert from "assert";

import { experimental_useObject as useObject } from "ai/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useGlobalState } from "@/app/(main)/o/[slug]/context";
import {
  conversationMessagesResponseSchema,
  CreateConversationMessageRequest,
  createConversationMessageResponseSchema,
} from "@/lib/api";
import { getProviderForModel, LLMModel, modelSchema } from "@/lib/llm/types";

import PrimaryButton from "../primary-button";

import AssistantMessage from "./assistant-message";
import ChatInput from "./chat-input";
import { SourceMetadata } from "./types";

type AiMessage = { content: string; role: "assistant"; id?: string; sources: SourceMetadata[]; model?: LLMModel };
type UserMessage = { content: string; role: "user" };
type SystemMessage = { content: string; role: "system" };
type Message = AiMessage | UserMessage | SystemMessage;

const UserMessage = ({ content }: { content: string }) => (
  <div className="mb-6 rounded-md px-4 py-2 self-end bg-[#F5F5F7]">{content}</div>
);

interface Props {
  conversationId?: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
    enabledModels: LLMModel[];
  };
  initMessage?: string;
  onSelectedDocumentId: (id: string) => void;
  shareId?: string;
  messages?: Message[];
}

export default function Chatbot({
  tenant,
  conversationId,
  initMessage,
  onSelectedDocumentId,
  shareId,
  messages: initialMessages,
}: Props) {
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceMetadata[]>>({});
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const router = useRouter();
  const [pendingMessage, setPendingMessage] = useState<null | { id: string; model: LLMModel }>(null);
  const pendingMessageRef = useRef<null | { id: string; model: LLMModel }>(null);
  pendingMessageRef.current = pendingMessage;
  const { initialModel } = useGlobalState();
  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    if (tenant.enabledModels.length > 0) {
      const parsed = modelSchema.safeParse(initialModel);
      if (parsed.success && tenant.enabledModels.includes(initialModel)) {
        return initialModel;
      }
      // if initial model from global state is no longer enabled by this tenant, change to one that is
      return tenant.enabledModels[0];
    }
    return initialModel;
  });
  const [isBreadth, setIsBreadth] = useState(false);
  const [rerankEnabled, setRerankEnabled] = useState(false);
  const [prioritizeRecent, setPrioritizeRecent] = useState(false);

  // Load settings from localStorage after initial render
  useEffect(() => {
    const saved = localStorage.getItem("chatSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setSelectedModel(settings.selectedModel ?? initialModel);
      setIsBreadth(settings.isBreadth ?? false);
      setRerankEnabled(settings.rerankEnabled ?? false);
      setPrioritizeRecent(settings.prioritizeRecent ?? false);
    }
  }, [initialModel]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "chatSettings",
      JSON.stringify({
        isBreadth,
        rerankEnabled,
        prioritizeRecent,
        selectedModel,
      }),
    );
  }, [isBreadth, rerankEnabled, prioritizeRecent, selectedModel]);

  const { isLoading, object, submit } = useObject({
    api: `/api/conversations/${conversationId}/messages`,
    schema: createConversationMessageResponseSchema,
    fetch: async function middleware(input: RequestInfo | URL, init?: RequestInit) {
      const res = await fetch(input, {
        ...init,
        headers: { ...init?.headers, tenant: tenant.slug },
      });
      const id = res.headers.get("x-message-id");
      const model = res.headers.get("x-model");

      assert(id);

      setPendingMessage({ id, model: model as LLMModel });
      return res;
    },
    onError: console.error,
    onFinish: (event) => {
      if (!event.object) return;

      const content = event.object.message;
      const model = pendingMessageRef.current?.model;
      setMessages((prev) => [...prev, { content: content, role: "assistant", sources: [], model }]);
    },
  });

  const handleSubmit = (content: string, model: LLMModel) => {
    const provider = getProviderForModel(model);
    if (!provider) {
      console.error(`No provider found for model ${model}`);
      return;
    }

    // Can't send messages from the share page; will always have a conversationId
    const payload: CreateConversationMessageRequest = {
      conversationId: conversationId!,
      content,
      model,
      isBreadth,
      rerankEnabled,
      prioritizeRecent,
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
      const res = await fetch(`/api/conversations/${conversationId}/messages/${pendingMessage.id}`, {
        headers: { tenant: tenant.slug },
      });
      if (!res.ok) return;

      const json = (await res.json()) as { id: string; sources: SourceMetadata[] };
      setSourceCache((prev) => ({ ...prev, [json.id]: json.sources }));
    })();
  }, [conversationId, pendingMessage, tenant.slug]);

  useEffect(() => {
    if (localInitMessage) {
      handleSubmit(localInitMessage, selectedModel);
      setLocalInitMessage(undefined);
    } else if (!shareId || !initialMessages) {
      (async () => {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: { tenant: tenant.slug },
        });
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
    setIsContinueLoading(true);
    try {
      // Create a new conversation with the same messages
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          tenant: tenant.slug,
        },
        body: JSON.stringify({
          // TODO: pass in conversation title along with initialMessages
          title: `Shared from "${messages[1]?.content || "conversation"}"`,
          messages: messages.map((message) => ({
            content: message.content,
            role: message.role,
            ...(message.role === "assistant" && message.model ? { model: message.model } : {}),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const { id } = await response.json();
      router.push(`/o/${tenant.slug}/conversations/${id}`);
    } catch (error) {
      console.error("Failed to continue conversation:", error);
    } finally {
      setIsContinueLoading(false);
    }
  };

  // Ensure selected model is in enabled models list
  useEffect(() => {
    if (!tenant.enabledModels.includes(selectedModel)) {
      // Update to first enabled model
      setSelectedModel(tenant.enabledModels[0]);
    }
  }, [selectedModel, tenant.enabledModels]);

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
                  name={tenant.name}
                  logoUrl={tenant.logoUrl}
                  content={message.content}
                  id={message.id}
                  sources={message.sources}
                  onSelectedDocumentId={onSelectedDocumentId}
                  model={message.model || selectedModel}
                  isGenerating={false}
                  tenantId={tenant.id}
                />
              </Fragment>
            ),
          )}
          {isLoading && (
            <AssistantMessage
              name={tenant.name}
              logoUrl={tenant.logoUrl}
              content={object?.message}
              id={pendingMessage?.id}
              sources={[]}
              onSelectedDocumentId={onSelectedDocumentId}
              model={pendingMessage?.model || selectedModel}
              isGenerating
              tenantId={tenant.id}
            />
          )}
          {/** TODO: only allow continue conversation if you are already part of this tenant */}
          {shareId && (
            <div className="flex justify-center mt-8">
              <PrimaryButton onClick={handleContinueConversation} disabled={isContinueLoading}>
                {isContinueLoading ? <Loader2 className="animate-spin" /> : "Continue Conversation"}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 w-full flex justify-center max-w-[717px]">
        {!shareId && (
          <div className="flex flex-col w-full p-2 pl-4 rounded-[16px] border border-[#D7D7D7]">
            <ChatInput
              handleSubmit={handleSubmit}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isBreadth={isBreadth}
              onBreadthChange={setIsBreadth}
              rerankEnabled={rerankEnabled}
              onRerankChange={setRerankEnabled}
              prioritizeRecent={prioritizeRecent}
              onPrioritizeRecentChange={setPrioritizeRecent}
              enabledModels={tenant.enabledModels}
            />
          </div>
        )}
      </div>
    </div>
  );
}
