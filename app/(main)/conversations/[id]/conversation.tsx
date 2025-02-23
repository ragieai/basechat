"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useGlobalState } from "@/app/(main)/context";
import Chatbot from "@/components/chatbot";
import { SharedConversationResponse } from "@/lib/api";

import Summary from "./summary";

interface Props {
  id: string;
  tenantName: string;
  isShared?: boolean;
}

export default function Conversation({ id, tenantName, isShared = false }: Props) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { initialMessage, setInitialMessage } = useGlobalState();
  const [sharedData, setSharedData] = useState<SharedConversationResponse | null>(null);

  useEffect(() => {
    setInitialMessage("");
  }, [setInitialMessage]);

  useEffect(() => {
    if (!isShared) return;

    const fetchSharedConversation = async () => {
      try {
        const response = await fetch(`/api/shared/${id}`);
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You don't have permission to view this conversation");
          }
          if (response.status === 404) {
            throw new Error("Shared conversation not found");
          }
          throw new Error("Failed to load shared conversation");
        }
        const data = await response.json();

        if (data.isOwner) {
          toast.info("Redirecting to your conversation");
          router.push(`/conversations/${data.conversation.id}`);
          return;
        }

        setSharedData(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        toast.error(message);
        router.push("/");
      }
    };

    fetchSharedConversation();
  }, [id, isShared, router]);

  const handleSelectedDocumentId = async (id: string) => {
    setDocumentId(id);
  };

  if (isShared && !sharedData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 size={18} className="ml-2 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <Chatbot
        name={tenantName}
        conversationId={isShared ? sharedData!.conversation.id : id}
        initMessage={initialMessage}
        onSelectedDocumentId={handleSelectedDocumentId}
        readOnly={isShared && !sharedData?.isOwner}
        messages={isShared ? sharedData?.messages : undefined}
      />
      {documentId && !isShared && (
        <Summary
          className="flex-1 min-w-[400px] w-[400px] rounded-[24px] p-8 mr-6 mb-4 bg-[#F5F5F7] overflow-y-auto"
          documentId={documentId}
          onCloseClick={() => setDocumentId(null)}
        />
      )}
    </div>
  );
}
