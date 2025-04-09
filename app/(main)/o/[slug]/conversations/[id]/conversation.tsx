"use client";

import { useEffect, useState } from "react";

import { useGlobalState } from "@/app/(main)/o/[slug]/context";
import Chatbot from "@/components/chatbot";
import { LLMModel } from "@/lib/llm/types";

import Summary from "./summary";

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
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { initialMessage, setInitialMessage, initialModel, setInitialModel } = useGlobalState();

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

  useEffect(() => {
    setInitialMessage("");
  }, [setInitialMessage]);

  const handleSelectedDocumentId = async (id: string) => {
    setDocumentId(id);
  };

  return (
    <div className="relative lg:flex h-full w-full">
      <Chatbot
        tenant={tenant}
        conversationId={id}
        initMessage={initialMessage}
        onSelectedDocumentId={handleSelectedDocumentId}
      />
      {documentId && (
        <div className="absolute top-0 left-0 right-0 lg:static">
          <Summary
            className="flex-1 w-full lg:min-w-[400px] lg:w-[400px] rounded-[24px] p-8 mr-6 mb-4 bg-[#F5F5F7] overflow-y-auto"
            documentId={documentId}
            slug={tenant.slug}
            onCloseClick={() => setDocumentId(null)}
          />
        </div>
      )}
    </div>
  );
}
