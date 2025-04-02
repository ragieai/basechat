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
  };
  isShared: boolean;
}

export default function Conversation({ id, tenant, isShared }: Props) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { initialMessage, setInitialMessage, initialModel, setInitialModel } = useGlobalState();

  // Check if the initial model is still in the enabled models list
  useEffect(() => {
    if (initialModel && tenant.enabledModels && tenant.enabledModels.length > 0) {
      // If the initial model is not in the enabled models list, update it
      if (!tenant.enabledModels.includes(initialModel)) {
        // Set to the first enabled model
        setInitialModel(tenant.enabledModels[0]);
      }
    }
  }, [initialModel, tenant.enabledModels, setInitialModel]);

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
