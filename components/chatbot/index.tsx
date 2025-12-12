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
import { saveAgenticUserMessage, saveAgenticAssistantMessage } from "@/lib/server/agentic-actions";
import * as schema from "@/lib/server/db/schema";

import { SourceMetadata } from "../../lib/types";
import AgenticResponse from "../agentic-retriever/agentic-response";
import { CONTEXT_END_DELIMITER } from "../agentic-retriever/agentic-response";
import { useAgenticRetrieverContext } from "../agentic-retriever/agentic-retriever-context";
import { finalAnswerSchema } from "../agentic-retriever/types";
import { Run } from "../agentic-retriever/use-agentic-retriever";

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
  /**
   * When true, disables all advanced settings UI.
   * Used for embedded chat experiences.
   */
  simplified?: boolean;
}

export default function Chatbot({
  tenant,
  conversationId,
  initMessage,
  onSelectedSource,
  onMessageConsumed,
  simplified = false,
}: Props) {
  const [localInitMessage, setLocalInitMessage] = useState(initMessage);
  const [messages, setMessages] = useState<Message[]>([]);
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
    simplified,
  });

  const {
    registerCallbacks,
    submit: agenticSubmit,
    status: agenticStatus,
    currentStepType,
    currentResponse,
    steps,
    stepTiming,
    result,
    setPastRuns,
    reset: agenticReset,
  } = useAgenticRetrieverContext();

  const handleAgenticStart = useCallback(
    async (payload: { runId: string; query: string; effort: string }) => {
      console.log("Agentic retrieval mode started with payload:", payload);
      setAgenticRunId(payload.runId);

      // Parse out the original user query from the context-rich query
      let originalQuery = payload.query;
      const contextEndIndex = payload.query.indexOf(CONTEXT_END_DELIMITER);
      if (contextEndIndex !== -1) {
        // Extract only the part after the context delimiter
        const queryPart = payload.query.substring(contextEndIndex + CONTEXT_END_DELIMITER.length).trim();
        // Remove the "userMessage: " prefix to get just the original content
        if (queryPart.startsWith("userMessage: ")) {
          originalQuery = queryPart.substring("userMessage: ".length);
        }
      }

      await saveAgenticUserMessage({
        conversationId,
        tenantId: tenant.id,
        userMessage: originalQuery,
      });

      return Promise.resolve();
    },
    [conversationId, tenant.id],
  );

  const handleAgenticDone = useCallback(
    async (payload: {
      result: z.infer<typeof finalAnswerSchema>;
      runId: string;
      query: string;
      effort: string;
      stepTiming: Array<number>;
    }) => {
      console.log("Agentic retrieval mode done with payload:", payload);

      // Prepare sources
      const sources = payload.result.evidence
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
        );

      // Update local state with the saved messages
      setMessages((prev) => [
        ...prev,
        {
          content: payload.result.text,
          role: "assistant",
          id: payload.runId,
          sources,
          model: "Deep Search",
          type: "agentic",
        } as AiMessage,
      ]);

      // Prepare agentic info for database storage using payload data
      const agenticInfo = {
        runId: payload.runId,
        timestamp: new Date().toISOString(),
        stepTiming: payload.stepTiming, // Use stepTiming from payload
        steps: payload.result.steps || steps, // Prefer result steps
        query: payload.query,
        result: payload.result,
        effort: payload.effort,
      };

      // Save the assistant message to the database
      await saveAgenticAssistantMessage({
        conversationId,
        tenantId: tenant.id,
        agenticInfo,
        sources,
      });

      setAgenticRunId(null);
    },
    [],
  );

  const handleAgenticError = useCallback(async (payload: string) => {
    const myMessage: AiMessage = {
      content: `Agentic response failed: ${payload}`,
      role: "assistant",
      id: "123", // run won't be found by id, will show failed state
      sources: [],
      model: "Deep Search",
      type: "agentic",
    };

    setMessages((prev) => [...prev, myMessage]);
    agenticReset();
    return Promise.resolve();
  }, []);

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

    if (retrievalMode !== "agentic") {
      console.log("Submitting message:", content, "with model:", model);
      setMessages([...messages, { content, role: "user" }]);
      submit(payload);
    } else {
      console.log("Submitting to agentic retrieval mode:", content);
      setMessages((prev) => [...prev, { content, role: "user" } as UserMessage]);

      // HACK: Agentic currently does not have a construct for previous messages in a conversation,
      // so shoe-horn in previous messages
      const contextQuery = allMessages
        .map((message) => {
          const roleLabel = message.role === "user" ? "userMessage" : "assistantMessage";
          return `${roleLabel}: ${message.content}`;
        })
        .join("\n");

      // Add delimiters to separate context from new user query
      const fullQuery = contextQuery + `\n${CONTEXT_END_DELIMITER}\nuserMessage: ${content}`;

      agenticSubmit({
        query: fullQuery,
        effort: agenticLevel,
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

        // Process all messages and extract agentic info for context
        const pastRuns: Record<string, Run> = {};
        const processedMessages: Message[] = [];

        messages.forEach((message) => {
          if ("type" in message && message.type === "agentic" && "agenticInfo" in message && message.agenticInfo) {
            const agenticInfo = message.agenticInfo;

            // Convert to Run format for agentic context
            const run: Run = {
              timestamp: agenticInfo.timestamp,
              query: agenticInfo.query,
              result: agenticInfo.result,
              stepTiming: agenticInfo.stepTiming,
              steps: agenticInfo.steps,
              effort: agenticInfo.effort || "medium", // Default to medium if not present
            };

            // Add to past runs
            pastRuns[agenticInfo.runId] = run;

            // For agent messages, transform them for display
            if (message.role === "assistant") {
              // Extract sources from the result evidence
              const sources =
                agenticInfo.result?.evidence
                  ?.filter((e: any) => e.type === "ragie")
                  .map((e: any) => ({
                    source_type: e.document_metadata?.source_type || "API",
                    file_path: e.document_metadata?.file_path || "",
                    source_url: e.document_metadata?.source_url || "",
                    documentId: e.document_id,
                    documentName: e.document_name,
                  })) || [];

              // Add transformed agentic message
              processedMessages.push({
                content: message.content || "",
                role: "assistant",
                id: agenticInfo.runId,
                sources,
                model: "Deep Search",
                type: "agentic",
              } as AiMessage);
            } else {
              // Add user messages as-is
              processedMessages.push(message);
            }
          } else {
            // Add standard messages as-is
            processedMessages.push(message);
          }
        });

        // Set all processed messages in chronological order
        setMessages(processedMessages);

        // Populate agentic context with past runs
        setPastRuns(pastRuns);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once
  }, []);

  // Process messages for display (add source cache for standard messages)
  const allMessages = useMemo(() => {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => (m.role === "assistant" && m.id && sourceCache[m.id] ? { ...m, sources: sourceCache[m.id] } : m));
  }, [messages, sourceCache]);

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
                {message.type === "agentic" && message.id ? (
                  <AgenticResponseContainer runId={message.id} tenant={tenant} />
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
          {agenticStatus !== "idle" && agenticRunId && (
            <AgenticResponse
              runId={agenticRunId}
              avatarName={tenant.name}
              avatarLogoUrl={tenant.logoUrl}
              tenantId={tenant.id}
              currentStepType={currentStepType}
              currentResponse={currentResponse}
              steps={steps}
              stepTiming={stepTiming}
              result={result}
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
            defaultStandardRetrievalMode={tenant.isBreadth ? "breadth" : "depth"}
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

  // If no run is available yet, show failed state
  if (!run) {
    return (
      <div className="flex w-full items-center">
        <div className="shrink-0">
          <div className="h-[40px] w-[40px] rounded-full bg-gray-200" />
        </div>
        <div className="flex-grow rounded-md ml-7 max-w-[calc(100%-60px)]">
          <div className="text-sm text-gray-500">Failed to load Deep Search response</div>
        </div>
      </div>
    );
  }

  //assert(run) was here instead of failed state

  return (
    <AgenticResponse
      runId={runId}
      currentStepType={null}
      currentResponse={null}
      steps={run.steps}
      stepTiming={run.stepTiming}
      result={run.result}
      avatarName={tenant.name}
      avatarLogoUrl={tenant.logoUrl}
      tenantId={tenant.id}
    />
  );
}
