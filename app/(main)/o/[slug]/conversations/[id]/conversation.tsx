"use client";

import { useEffect, useState } from "react";

import { useGlobalState } from "@/app/(main)/o/[slug]/context";
import Chatbot from "@/components/chatbot";
import { Skeleton } from "@/components/ui/skeleton";
import { LLMModel } from "@/lib/llm/types";

import Summary from "./summary";

import { SourceMetadata } from "@/lib/types";

interface Props {
  id: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
    enabledModels: LLMModel[];
    defaultModel: LLMModel | null;
    isBreadth: boolean | null;
    rerankEnabled: boolean | null;
    prioritizeRecent: boolean | null;
    overrideBreadth: boolean | null;
    overrideRerank: boolean | null;
    overridePrioritizeRecent: boolean | null;
  };
}

export default function Conversation({ id, tenant }: Props) {
  const [source, setSource] = useState<SourceMetadata | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const {
    initialMessage,
    setInitialMessage,
    initialModel,
    setInitialModel,
    isMessageConsumed,
    setMessageConsumed,
    clearInitialMessage,
  } = useGlobalState();

  // Move the default model logic outside useEffect
  const defaultModel = tenant.defaultModel || tenant.enabledModels[0];

  // Simplified useEffect that only handles validation
  useEffect(() => {
    if (initialModel && tenant.enabledModels.length > 0) {
      if (!tenant.enabledModels.includes(initialModel)) {
        setInitialModel(defaultModel);
      }
    }
  }, [initialModel, tenant.enabledModels, setInitialModel, defaultModel]);

  // Only clear the initial message if it has been consumed
  useEffect(() => {
    if (isMessageConsumed) {
      clearInitialMessage();
    }
  }, [isMessageConsumed, clearInitialMessage]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSelectedSource = async (source: SourceMetadata) => {
    setSource(source);
  };

  return (
    <div className="relative lg:flex h-full w-full">
      {isMounted ? (
        <>
          <Chatbot
            tenant={tenant}
            conversationId={id}
            initMessage={initialMessage}
            onSelectedSource={handleSelectedSource}
            onMessageConsumed={() => setMessageConsumed(true)}
          />
          {source && (
            <div className="absolute top-0 left-0 right-0 lg:static lg:h-full">
              <Summary
                key={source.documentId}
                className="flex-1 w-full lg:min-w-[400px] lg:w-[400px] rounded-[24px] p-8 mr-6 mb-4 bg-[#F5F5F7] max-h-[calc(100vh-155px)] overflow-y-auto"
                source={source}
                slug={tenant.slug}
                onCloseClick={() => setSource(null)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col w-full p-4 max-w-[717px]">
            <div className="flex items-start mb-6">
              <Skeleton className="h-8 w-8 rounded-full mr-3" />
              <div className="flex flex-col flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-20 w-[80%] rounded-md" />
              </div>
            </div>
            <div className="flex justify-end mb-6">
              <Skeleton className="h-16 w-[60%] rounded-md bg-[#F5F5F7]" />
            </div>
            <div className="flex items-start mb-6">
              <Skeleton className="h-8 w-8 rounded-full mr-3" />
              <div className="flex flex-col flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-24 w-[70%] rounded-md" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
