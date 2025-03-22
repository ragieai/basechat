"use client";

import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { z } from "zod";

import ChatInput from "@/components/chatbot/chat-input";
import Logo from "@/components/tenant/logo/logo";
import * as schema from "@/lib/server/db/schema";

const inter = Inter({ subsets: ["latin"] });

const conversationResponseSchema = z.object({ id: z.string() });

interface Props {
  className?: string;
  tenantSlug: string;
  tenant: {
    name: string;
    logoUrl: string | null;
    question1: string | null;
    question2: string | null;
    question3: string | null;
  };
}

export default function PublicWelcome({ className, tenantSlug, tenant }: Props) {
  const router = useRouter();

  const handleSubmit = async (content: string) => {
    try {
      // First create the conversation
      const res = await fetch(`/api/public/${tenantSlug}/conversations`, {
        method: "POST",
        body: JSON.stringify({ title: content }),
      });
      if (!res.ok) throw new Error("Could not create conversation");

      const json = await res.json();
      const conversation = conversationResponseSchema.parse(json);

      // Then send the initial message
      const messageRes = await fetch(`/api/public/${tenantSlug}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          conversationId: conversation.id,
        }),
      });
      if (!messageRes.ok) throw new Error("Could not send message");

      // Wait for the message to be processed (the response includes the message ID)
      const messageJson = await messageRes.json();

      // Add a small delay to ensure the message is fully processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify the conversation exists before redirecting
      const verifyRes = await fetch(`/api/public/${tenantSlug}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Verify" }),
      });

      if (verifyRes.ok) {
        // Use replace instead of push to avoid adding to history
        router.replace(`/o/${tenantSlug}`);
      } else {
        throw new Error("Failed to verify conversation");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      // You might want to show an error message to the user here
    }
  };

  const questions = [
    tenant.question1 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
    tenant.question2 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
    tenant.question3 || "Sample question. Lorem ipsum dolor sit amet consectetur. Sample question.",
  ];

  return (
    <div className={className}>
      <div className={`h-full flex flex-col justify-center ${inter.className}`}>
        <Logo name={tenant.name} url={tenant.logoUrl} width={100} height={100} className="avatar mb-8" />
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
