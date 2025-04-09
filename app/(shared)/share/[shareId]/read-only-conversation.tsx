"use client";

import { useState } from "react";
import { z } from "zod";

import ReadOnlyChatbot from "@/components/chatbot/read-only-chatbot";
import { SearchSettings, ShareSettings } from "@/lib/api";
import { LLMModel } from "@/lib/llm/types";
import { sharedConversations } from "@/lib/server/db/schema";

import Summary from "../../../(main)/o/[slug]/conversations/[id]/summary";
interface Props {
  id: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
    enabledModels: LLMModel[];
    defaultModel: LLMModel | null;
    searchSettings: SearchSettings | null;
  };
  share: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    conversationId: string;
    createdBy: string;
    accessType: "email" | "public" | "organization";
    recipientEmails: string[] | null;
    expiresAt: string | null;
  };
}

export default function ReadOnlyConversation({ id, tenant, share }: Props) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const createdBy = share.createdBy;

  const handleSelectedDocumentId = async (id: string) => {
    setDocumentId(id);
  };

  return (
    <div className="relative lg:flex h-full w-full">
      <ReadOnlyChatbot
        tenant={tenant}
        conversationId={id}
        onSelectedDocumentId={handleSelectedDocumentId}
        createdBy={createdBy}
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
