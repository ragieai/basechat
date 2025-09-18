"use client";

import assert from "assert";

import { experimental_useObject as useObject } from "ai/react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { useSearchSettings } from "@/hooks/use-search-settings";
import {
  conversationMessagesResponseSchema,
  CreateConversationMessageRequest,
  createConversationMessageResponseSchema,
} from "@/lib/api";
import { getProviderForModel, LLMModel } from "@/lib/llm/types";
import { getBillingSettingsPath } from "@/lib/paths";
import * as schema from "@/lib/server/db/schema";

import { SourceMetadata } from "../../lib/types";
import AgenticResponse from "../agentic-retriever/agentic-response";
import { useAgenticRetrieverContext } from "../agentic-retriever/agentic-retriever-context";
import { finalAnswerSchema, resultSchema } from "../agentic-retriever/types";

import AssistantMessage from "./assistant-message";
import ChatInput from "./chat-input";

type AiMessage = {
  content: string;
  role: "assistant";
  id?: string;
  sources: SourceMetadata[];
  model?: LLMModel;
  type?: "agentic" | "standard";
};
type UserMessage = { content: string; role: "user" };
type SystemMessage = { content: string; role: "system" };
type Message = AiMessage | UserMessage | SystemMessage;

const UserMessage = ({ content }: { content: string }) => (
  <div className="mb-6 rounded-md px-4 py-2 self-end bg-[#F5F5F7] max-w-[70%]">{content}</div>
);

interface Props {
  conversationId: string;
  tenant: typeof schema.tenants.$inferSelect;
  initMessage?: string;
  onSelectedSource: (source: SourceMetadata) => void;
  onMessageConsumed?: () => void;
}

export default function Chatbot({ tenant, conversationId, initMessage, onSelectedSource, onMessageConsumed }: Props) {
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agenticMessages, setAgenticMessages] = useState<Array<AiMessage | UserMessage>>([]);
  const [agenticRunId, setAgenticRunId] = useState<string | null>(null);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceMetadata[]>>({});
  const [pendingMessage, setPendingMessage] = useState<null | { id: string; model: LLMModel }>(null);
  const pendingMessageRef = useRef<null | { id: string; model: LLMModel }>(null);
  pendingMessageRef.current = pendingMessage;

  const {
    retrievalMode,
    selectedModel,
    rerankEnabled,
    prioritizeRecent,
    agenticLevel,
    setRetrievalMode,
    setSelectedModel,
    setRerankEnabled,
    setPrioritizeRecent,
    setAgenticLevel,
    enabledModels,
    canSetIsBreadth,
    canSetRerankEnabled,
    canSetPrioritizeRecent,
    canSetAgenticLevel,
    canUseAgentic,
  } = useSearchSettings({
    tenant,
    enableGlobalState: false,
  });

  const handleAgenticStart = useCallback((runId: string) => {
    console.log("Agentic retrieval mode started with run ID:", runId);
    setAgenticRunId(runId);
    return Promise.resolve();
  }, []);

  const handleAgenticDone = useCallback((payload: { result: z.infer<typeof finalAnswerSchema>; runId: string }) => {
    console.log("Agentic retrieval mode done with payload:", payload);
    setAgenticMessages((prev) => [
      // TODO: this is where we save to the DB
      // may need to save in mem, wait for response with ID, then replace and save real one with ID
      ...prev,
      {
        content: payload.result.text,
        role: "assistant",
        id: payload.runId,
        sources: payload.result.evidence
          .filter((e) => e.type === "ragie")
          .map(
            (e) =>
              ({
                source_type: e.document_metadata.source_type || "API",
                file_path: e.document_metadata.file_path || "",
                source_url: e.document_metadata.source_url || "",
                documentId: e.document_id,
                documentName: e.document_name,
              }) as SourceMetadata,
          ),
        model: "Deep Search",
      },
    ]);
    setAgenticRunId(null);
    return Promise.resolve();
  }, []);

  const handleAgenticError = useCallback((payload: string) => {
    console.log("Agentic retrieval mode error with payload:", payload);
    return Promise.resolve();
  }, []);

  const { registerCallbacks, ...agenticRetriever } = useAgenticRetrieverContext();

  useEffect(() => {
    const unregister = registerCallbacks({
      onStart: handleAgenticStart,
      onDone: handleAgenticDone,
      onError: handleAgenticError,
    });

    return unregister;
  }, [registerCallbacks, handleAgenticStart, handleAgenticDone, handleAgenticError]);

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
    console.log("Submitting message:", content, "with model:", model);
    const provider = getProviderForModel(model);
    if (!provider) {
      return;
    }

    const payload: CreateConversationMessageRequest = {
      conversationId,
      content,
      model,
      isBreadth: retrievalMode === "breadth",
      rerankEnabled,
      prioritizeRecent,
    };
    setMessages([...messages, { content, role: "user" }]);
    if (retrievalMode !== "agentic") {
      submit(payload);
    } else {
      console.log("Submitting to agentic retrieval mode:", content);
      // TODO: Implement agentic mode submission
      setAgenticMessages((prev) => [...prev, { content, role: "user", id: createRandomId(), sources: [] }]);

      // Map agentic level to effort parameter
      const effortMap = {
        fast: "low",
        balanced: "medium",
        thorough: "high",
      } as const;

      agenticRetriever.submit({
        query: content,
        effort: effortMap[agenticLevel],
      });
    }
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
      onMessageConsumed?.();
    } else {
      (async () => {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: { tenant: tenant.slug },
        });
        if (!res.ok) throw new Error("Could not load conversation");
        const json = await res.json();
        const messages = conversationMessagesResponseSchema.parse(json);
        setMessages(messages);
        // TODO: set agentic messages from messages.agenticInfo JSONB column
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once
  }, []);

  // Combine normal messages and agentic messages for display
  const allMessages = useMemo(() => {
    const normalMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => (m.role === "assistant" && m.id && sourceCache[m.id] ? { ...m, sources: sourceCache[m.id] } : m));

    // Combine normal messages with agentic messages
    return [...normalMessages, ...agenticMessages];
  }, [messages, sourceCache, agenticMessages]);

  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    container.current?.scrollTo({
      top: container.current.scrollHeight,
      behavior: "smooth",
    });
  }, [allMessages]);

  return (
    <div className="flex h-full w-full items-center flex-col">
      <div ref={container} className="flex flex-col h-full w-full items-center overflow-y-auto">
        <div className="flex flex-col h-full w-full p-4 max-w-[717px]">
          {allMessages.map((message, i) =>
            message.role === "user" ? (
              <UserMessage key={i} content={message.content} />
            ) : (
              <Fragment key={i}>
                {message.type === "agentic" ? (
                  <AgenticResponseContainer runId={message.id!} tenant={tenant} />
                ) : (
                  <AssistantMessage
                    name={tenant.name}
                    logoUrl={tenant.logoUrl}
                    content={message.content}
                    id={message.id}
                    sources={message.sources}
                    onSelectedSource={onSelectedSource}
                    model={message.model || selectedModel}
                    isGenerating={false}
                    tenantId={tenant.id}
                  />
                )}
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
              onSelectedSource={onSelectedSource}
              model={pendingMessage?.model || selectedModel}
              isGenerating
              tenantId={tenant.id}
            />
          )}
          {agenticRetriever.status !== "idle" && agenticRunId && (
            <AgenticResponse
              runId={agenticRunId}
              avatarName={tenant.name}
              avatarLogoUrl={tenant.logoUrl}
              tenantId={tenant.id}
              currentStepType={agenticRetriever.currentStepType}
              currentResponse={agenticRetriever.currentResponse}
              steps={agenticRetriever.steps}
              stepTiming={agenticRetriever.stepTiming}
              result={agenticRetriever.result}
            />
          )}
        </div>
      </div>
      <div className="p-4 w-full flex justify-center max-w-[717px]">
        <div className="flex flex-col w-full p-2 pl-4 rounded-[16px] border border-[#D7D7D7]">
          <ChatInput
            handleSubmit={handleSubmit}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            retrievalMode={retrievalMode}
            onRetrievalModeChange={setRetrievalMode}
            rerankEnabled={rerankEnabled}
            onRerankChange={setRerankEnabled}
            prioritizeRecent={prioritizeRecent}
            onPrioritizeRecentChange={setPrioritizeRecent}
            agenticLevel={agenticLevel}
            onAgenticLevelChange={setAgenticLevel}
            agenticEnabled={canUseAgentic}
            enabledModels={enabledModels}
            canSetIsBreadth={canSetIsBreadth}
            canSetRerankEnabled={canSetRerankEnabled}
            canSetPrioritizeRecent={canSetPrioritizeRecent}
            canSetAgenticLevel={canSetAgenticLevel}
            tenantPaidStatus={tenant.paidStatus}
            // TODO Mock token data for testing
            remainingTokens={7500}
            tokenBudget={10000}
            nextTokenDate="January 15, 2067"
            billingSettingsUrl={getBillingSettingsPath(tenant.slug)}
          />
        </div>
      </div>
    </div>
  );
}

function AgenticResponseContainer({
  runId,
  tenant,
}: {
  runId: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
  };
}) {
  const { getRun } = useAgenticRetrieverContext();
  const run = getRun(runId);

  // If no run is available yet, show a loading state
  if (!run) {
    return (
      <div className="flex w-full">
        <div className="mb-8 shrink-0">
          <div className="h-[40px] w-[40px] rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="self-start flex-grow mb-6 rounded-md ml-7 max-w-[calc(100%-60px)]">
          <div className="text-sm text-gray-500">Loading agentic response...</div>
        </div>
      </div>
    );
  }

  //assert(run) was here instead of the loading state

  return (
    <AgenticResponse
      runId={runId}
      currentStepType={null}
      currentResponse={null}
      steps={run.steps} // TODO: this run stuff (runId, step, stepTiming, result) is in messages.agenticInfo JSONB col
      stepTiming={run.stepTiming}
      result={run.result}
      avatarName={tenant.name}
      avatarLogoUrl={tenant.logoUrl}
      tenantId={tenant.id}
    />
  );
}

function createRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
