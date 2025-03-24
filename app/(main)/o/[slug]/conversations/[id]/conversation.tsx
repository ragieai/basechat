"use client";

import { useEffect, useState } from "react";

import Chatbot from "@/components/chatbot";

import Summary from "./summary";

import { useGlobalState } from "@/app/(main)/[slug]/context";

interface Props {
  id: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
  };
}

export default function Conversation({ id, tenant }: Props) {
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
        tenant={tenant}
        conversationId={id}
        initMessage={initialMessage}
        onSelectedDocumentId={handleSelectedDocumentId}
      />
      {documentId && (
        <Summary
          className="flex-1 min-w-[400px] w-[400px] rounded-[24px] p-8 mr-6 mb-4 bg-[#F5F5F7] overflow-y-auto"
          documentId={documentId}
          slug={tenant.slug}
          onCloseClick={() => setDocumentId(null)}
        />
      )}
    </div>
  );
}
