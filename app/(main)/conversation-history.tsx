"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { conversationListResponseSchema, conversationSchema } from "@/lib/api";

import NewChatIcon from "../../public/icons/new-chat.svg";

interface Props {
  className?: string;
  tenantSlug: string | null;
}

export default function ConversationHistory({ className, tenantSlug }: Props) {
  const [conversations, setConversations] = useState<z.infer<typeof conversationSchema>[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Could not load conversations");
      const json = await res.json();
      const conversations = conversationListResponseSchema.parse(json);
      setConversations(conversations);
    })();
  }, []);

  if (!tenantSlug) {
    return null;
  }

  return (
    <div className={className}>
      <Link href={`/${tenantSlug}`}>
        <div className="flex items-center">
          <Image src={NewChatIcon} height={24} width={24} alt="New chat" />
          <div className="ml-1.5 font-medium">New Chat</div>
        </div>
      </Link>

      <div className="max-h-[540px] overflow-y-auto">
        <div className="font-semibold text-[13px] mt-8">History</div>
        {conversations.map((conversation, i) => (
          <Link key={i} href={`/${tenantSlug}/conversations/${conversation.id}`}>
            <div className="mt-4 truncate">{conversation.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
