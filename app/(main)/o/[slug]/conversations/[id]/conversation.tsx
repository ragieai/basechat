"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useGlobalState } from "@/app/(main)/o/[slug]/context";
import Chatbot from "@/components/chatbot";
import { SharedConversationResponse } from "@/lib/api";
import { LLMModel } from "@/lib/llm/types";

import Summary from "./summary";

interface Props {
  conversationId?: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    slug: string;
    id: string;
    enabledModels: LLMModel[];
  };
  shareId?: string;
}

export default function Conversation({ conversationId, tenant, shareId }: Props) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { initialMessage, setInitialMessage, initialModel, setInitialModel } = useGlobalState();
  const [sharedData, setSharedData] = useState<SharedConversationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!!shareId);
  const router = useRouter();

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

  // Fetch shared conversation data if this is a shared view
  useEffect(() => {
    if (!shareId) return;

    const fetchSharedConversation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/shared/${shareId}`);
        if (!response.ok) {
          throw new Error("Failed to load shared conversation");
        }
        const data = await response.json();

        // If owner, redirect to the original conversation
        if (data.isOwner) {
          toast.info("Redirecting to your conversation");
          router.push(`/o/${data.tenant.slug}/conversations/${data.conversation.id}`);
          return;
        }

        setSharedData(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        toast.error(message);
        router.push(`/o/${tenant.slug}`); // back tenant home page
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedConversation();
  }, [shareId, router, tenant.slug]);

  const handleSelectedDocumentId = async (id: string) => {
    setDocumentId(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 size={18} className="ml-2 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative lg:flex h-full w-full">
      <Chatbot
        tenant={tenant}
        conversationId={sharedData?.conversation.id ?? conversationId}
        initMessage={initialMessage}
        onSelectedDocumentId={handleSelectedDocumentId}
        shareId={shareId}
        messages={sharedData?.messages}
      />
      {documentId && !shareId && (
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
