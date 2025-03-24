"use client";

import { useEffect, useState } from "react";

import { useGlobalState } from "@/app/(main)/[slug]/context";
import Chatbot from "@/components/chatbot";

import Summary from "./summary";

interface Props {
  id: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
}

export default function Conversation({ id, tenantName, tenantLogoUrl }: Props) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { initialMessage, setInitialMessage } = useGlobalState();

  useEffect(() => {
    setInitialMessage("");
  }, [setInitialMessage]);

  const handleSelectedDocumentId = async (id: string) => {
    setDocumentId(id);
  };

  return (
    <div className="flex h-full w-full">
      <Chatbot
        name={tenantName}
        logoUrl={tenantLogoUrl}
        conversationId={id}
        initMessage={initialMessage}
        onSelectedDocumentId={handleSelectedDocumentId}
      />
      {documentId && (
        <Summary
          className="flex-1 min-w-[400px] w-[400px] rounded-[24px] p-8 mr-6 mb-4 bg-[#F5F5F7] overflow-y-auto"
          documentId={documentId}
          onCloseClick={() => setDocumentId(null)}
        />
      )}
    </div>
  );
}
