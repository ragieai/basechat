import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { conversationListResponseSchema, conversationSchema } from "@/lib/api";
import { getConversationPath, getTenantPath } from "@/lib/paths";

import NewChatIcon from "../../../public/icons/new-chat.svg";

interface Props {
  className?: string;
  tenant: { slug: string };
}

type Conversation = z.infer<typeof conversationSchema>;

export default function ConversationHistory({ className, tenant }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/conversations", { headers: { tenant: tenant.slug } });
      const json = await res.json();
      const conversations = conversationListResponseSchema.parse(json);
      setConversations(conversations);
    })();
  }, []);

  return (
    <div className={className}>
      <Link href={getTenantPath(tenant.slug)}>
        <div className="flex items-center">
          <Image src={NewChatIcon} height={24} width={24} alt="New chat" />
          <div className="ml-1.5 font-medium">New Chat</div>
        </div>
      </Link>

      <div className="max-h-[540px] overflow-y-auto">
        <div className="font-semibold text-[13px] mt-8">History</div>
        {conversations.map((conversation, i) => (
          <Link key={i} href={getConversationPath(tenant.slug, conversation.id)}>
            <div className="mt-4 truncate">{conversation.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
