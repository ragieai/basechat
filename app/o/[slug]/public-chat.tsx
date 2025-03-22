"use client";
// wrapper for the chatbot component
import { useState } from "react";

import Chatbot from "@/components/chatbot";

interface Props {
  name: string;
  logoUrl?: string | null;
  conversationId: string;
  isPublic: boolean;
  tenantSlug: string;
}

export default function PublicChat({ name, logoUrl, conversationId, isPublic, tenantSlug }: Props) {
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleSelectedDocumentId = (id: string) => {
    setDocumentId(id);
  };

  return (
    <div className="flex h-screen w-screen flex-col">
      <Chatbot
        name={name}
        logoUrl={logoUrl}
        conversationId={conversationId}
        onSelectedDocumentId={handleSelectedDocumentId}
        isPublic={isPublic}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
