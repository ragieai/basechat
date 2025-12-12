"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import { AgenticRetrieverProvider } from "@/components/agentic-retriever/agentic-retriever-context";
import Chatbot from "@/components/chatbot";
import ChatInput from "@/components/chatbot/chat-input";
import Logo from "@/components/tenant/logo/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchSettings } from "@/hooks/use-search-settings";
import { Profile } from "@/lib/api";
import { DEFAULT_WELCOME_MESSAGE } from "@/lib/constants";
import {
  storeJwtToken,
  getJwtToken,
  addConversationId,
  getCurrentConversationId,
  storeCurrentConversationId,
} from "@/lib/embed-storage";
import { DEFAULT_MODEL, LLMModel } from "@/lib/llm/types";
import * as schema from "@/lib/server/db/schema";

import { ProfileProvider } from "../../../(main)/o/[slug]/profile-context";

type TenantInfo = Pick<
  typeof schema.tenants.$inferSelect,
  | "id"
  | "name"
  | "slug"
  | "logoUrl"
  | "welcomeMessage"
  | "question1"
  | "question2"
  | "question3"
  | "isBreadth"
  | "paidStatus"
  | "disabledModels"
  | "defaultModel"
>;

interface SessionData {
  token: string;
  userId: string;
  profileId: string;
  tenant: TenantInfo;
}

export default function EmbedPage() {
  // HERE! Maybe we need a quick client component that looks for a session in local storage
  // Uses it or creates a new one if it doesn't exist

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const searchParams = useSearchParams();
  const existingConvId = searchParams.get("convId");
  const tenant = searchParams.get("tenant");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        // Check for existing token
        const existingToken = getJwtToken(slug);

        if (existingToken) {
          // Validate existing token
          const validateRes = await fetch(`/api/embed/${slug}/session`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${existingToken}`,
            },
          });

          if (validateRes.ok) {
            const data = await validateRes.json();
            setSessionData({
              token: existingToken,
              userId: data.userId,
              profileId: data.profileId,
              tenant: data.tenant,
            });

            // Check for existing conversation
            const existingConversationId = getCurrentConversationId(slug);
            if (existingConversationId) {
              setConversationId(existingConversationId);
            }

            setIsLoading(false);
            return;
          }
        }

        // Create new session
        const createRes = await fetch(`/api/embed/${slug}/session`, {
          method: "POST",
        });

        if (!createRes.ok) {
          const errData = await createRes.json();
          throw new Error(errData.error || "Failed to create session");
        }

        const data = await createRes.json();
        storeJwtToken(slug, data.token);
        setSessionData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Session initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
        setIsLoading(false);
      }
    };

    initSession();
  }, [slug]);

  // Create a new conversation
  const createConversation = useCallback(
    async (content: string) => {
      if (!sessionData) return;

      try {
        const res = await fetch(`/api/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.token}`,
            tenant: slug,
          },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          throw new Error("Failed to create conversation");
        }

        const { id } = await res.json();
        addConversationId(slug, id);
        storeCurrentConversationId(slug, id);
        setInitialMessage(content);
        setConversationId(id);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    },
    [sessionData, slug],
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="flex flex-col w-full max-w-[717px]">
          <div className="flex items-start mb-6">
            <Skeleton className="h-[80px] w-[80px] rounded-full" />
          </div>
          <Skeleton className="h-[40px] w-[400px] mb-8" />
          <Skeleton className="h-[100px] w-full rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Unable to load chat</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  // Create a mock profile for the ProfileProvider
  const profile: Profile = {
    id: sessionData.profileId,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: sessionData.tenant.id,
    userId: sessionData.userId,
    role: "guest",
  };

  // If we have a conversation, show the chatbot
  if (conversationId) {
    return (
      <ProfileProvider profile={profile}>
        <AgenticRetrieverProvider tenantSlug={slug}>
          <EmbeddedChatbot
            tenant={sessionData.tenant}
            conversationId={conversationId}
            token={sessionData.token}
            slug={slug}
            initialMessage={initialMessage}
            onMessageConsumed={() => setInitialMessage(null)}
            onNewChat={() => {
              storeCurrentConversationId(slug, null);
              setConversationId(null);
            }}
          />
        </AgenticRetrieverProvider>
      </ProfileProvider>
    );
  }

  // Show welcome screen
  return (
    <ProfileProvider profile={profile}>
      <EmbeddedWelcome tenant={tenant} onSubmit={createConversation} />
    </ProfileProvider>
  );
}

// Embedded welcome component
function EmbeddedWelcome({
  tenant,
  onSubmit,
}: {
  tenant: typeof schema.tenants.$inferSelect;
  onSubmit: (content: string) => void;
}) {
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
    simplified: true,
  });

  const handleSubmit = (content: string, _model: LLMModel = DEFAULT_MODEL) => {
    onSubmit(content);
  };

  const questions = [tenant.question1, tenant.question2, tenant.question3].filter(
    (question): question is string => question !== null && question.trim() !== "",
  );

  return (
    <div className="flex flex-col h-full p-4 max-w-[717px] mx-auto">
      <div className="flex-1 flex flex-col justify-center">
        <Logo name={tenant.name} url={tenant.logoUrl} width={80} height={80} className="mb-6" tenantId={tenant.id} />
        <h1 className="mb-8 text-2xl lg:text-3xl font-bold leading-tight text-[#343A40]">
          {(tenant.welcomeMessage || DEFAULT_WELCOME_MESSAGE).replace("{{company.name}}", tenant.name)}
        </h1>
        {questions.length > 0 && (
          <div className="flex flex-col md:flex-row items-stretch justify-evenly space-y-3 md:space-y-0 md:space-x-2 mb-6">
            {questions.map((question, i) => (
              <div
                key={i}
                className="rounded-md border p-3 w-full md:w-1/3 cursor-pointer hover:bg-gray-50 transition-colors text-sm"
                onClick={() => handleSubmit(question, selectedModel)}
              >
                {question}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-full flex flex-col items-center p-2 pl-4 rounded-[16px] border border-[#D7D7D7]">
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
        />
      </div>
    </div>
  );
}

// Embedded chatbot wrapper that configures fetch for JWT auth
function EmbeddedChatbot({
  tenant,
  conversationId,
  token,
  slug,
  initialMessage,
  onMessageConsumed,
  onNewChat,
}: {
  tenant: typeof schema.tenants.$inferSelect;
  conversationId: string;
  token: string;
  slug: string;
  initialMessage: string | null;
  onMessageConsumed: () => void;
  onNewChat: () => void;
}) {
  // Override fetch globally for this component to add Authorization header
  // // This is needed because the Chatbot component uses fetch internally
  // useEffect(() => {
  //   const originalFetch = window.fetch;

  //   window.fetch = async (input, init) => {
  //     const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  //     // For API calls, add tenant header and JWT auth
  //     if (url.includes("/api/")) {
  //       const headers = new Headers(init?.headers);
  //       headers.set("tenant", slug);
  //       headers.set("Authorization", `Bearer ${token}`);

  //       return originalFetch(input, {
  //         ...init,
  //         headers,
  //       });
  //     }

  //     return originalFetch(input, init);
  //   };

  //   return () => {
  //     window.fetch = originalFetch;
  //   };
  // }, [token, slug]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <button
          onClick={onNewChat}
          className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          ← New chat
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Chatbot
          tenant={tenant}
          conversationId={conversationId}
          initMessage={initialMessage || undefined}
          onSelectedSource={() => {}} // No source panel in embedded view
          onMessageConsumed={onMessageConsumed}
          simplified={true}
        />
      </div>
    </div>
  );
}
