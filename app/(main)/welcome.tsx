"use client";

import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { z } from "zod";

import ChatInput from "@/components/chatbot/chat-input";
import * as schema from "@/lib/server/db/schema";
import { getInitials } from "@/lib/utils";

import { useGlobalState } from "./context";

const inter = Inter({ subsets: ["latin"] });

const conversationResponseSchema = z.object({ id: z.string() });

interface Props {
  tenant: typeof schema.tenants.$inferSelect;
  className?: string;
}

export default function Welcome({ tenant, className }: Props) {
  const router = useRouter();
  const { setInitialMessage } = useGlobalState();

  const handleSubmit = async (content: string) => {
    const res = await fetch("/api/conversations", { method: "POST", body: JSON.stringify({ title: content }) });
    if (!res.ok) throw new Error("Could not create conversation");

    const json = await res.json();
    const conversation = conversationResponseSchema.parse(json);
    setInitialMessage(content);
    router.push(`/conversations/${conversation.id}`);
  };

  const initials = getInitials(tenant.name);

  const questions = [
    tenant.question1 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
    tenant.question2 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
    tenant.question3 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
  ];

  return (
    <div className={className}>
      <div className={`h-full flex flex-col justify-center ${inter.className}`}>
        <div className="h-[100px] w-[100px] avatar rounded-[50px] text-white flex items-center justify-center font-bold text-[32px] mb-8">
          {initials}
        </div>
        <h1 className="mb-12 text-[40px] font-bold leading-[50px]">
          Hello, I&apos;m {tenant.name}&apos;s AI.
          <br />
          What would you like to know?
        </h1>
        <div className="flex items-start justify-evenly space-x-2">
          {questions.map((question, i) => (
            <div
              key={i}
              className="rounded-md border p-4 h-full w-1/3 cursor-pointer"
              onClick={() => handleSubmit(question)}
            >
              {question}
            </div>
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col items-center p-2 pl-4 rounded-[24px] border border-[#D7D7D7]">
        <ChatInput handleSubmit={handleSubmit} />
      </div>
    </div>
  );
}
