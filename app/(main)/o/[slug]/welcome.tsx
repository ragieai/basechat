"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";

import ChatInput from "@/components/chatbot/chat-input";
import Logo from "@/components/tenant/logo/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/lib/api";
import { DEFAULT_WELCOME_MESSAGE } from "@/lib/constants";
import { DEFAULT_MODEL, LLMModel, modelSchema, getEnabledModelsFromDisabled } from "@/lib/llm/types";
import { getConversationPath } from "@/lib/paths";
import * as schema from "@/lib/server/db/schema";

import { useGlobalState } from "./context";
import { ProfileProvider } from "./profile-context";

const inter = Inter({ subsets: ["latin"] });

const conversationResponseSchema = z.object({ id: z.string() });

interface Props {
  tenant: typeof schema.tenants.$inferSelect;
  className?: string;
  profile: Profile;
}

export default function Welcome({ tenant, className, profile }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setInitialMessage, setInitialModel } = useGlobalState();
  const [isBreadth, setIsBreadth] = useState(tenant.isBreadth ?? false);
  const [rerankEnabled, setRerankEnabled] = useState(tenant.rerankEnabled ?? false);
  const [prioritizeRecent, setPrioritizeRecent] = useState(tenant.prioritizeRecent ?? false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const enabledModels = useMemo(() => getEnabledModelsFromDisabled(tenant.disabledModels), [tenant.disabledModels]);

  const [selectedModel, setSelectedModel] = useState<LLMModel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        const savedModel = settings.selectedModel;
        const parsed = modelSchema.safeParse(savedModel);
        if (parsed.success && enabledModels.includes(savedModel)) {
          return savedModel;
        }
      }
    }
    // Validate first enabled model or default model
    const firstModel = enabledModels[0];
    const parsed = modelSchema.safeParse(firstModel);
    if (parsed.success) {
      return tenant.defaultModel || firstModel;
    }
    return DEFAULT_MODEL;
  });

  // Set isClient to true after initial mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load user settings from localStorage after initial render and tenant settings are loaded
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        // Apply user settings only if overrides are allowed
        if (!tenant.isBreadth || tenant.overrideBreadth) {
          setIsBreadth(settings.isBreadth ?? false);
        }
        if (!tenant.rerankEnabled || tenant.overrideRerank) {
          setRerankEnabled(settings.rerankEnabled ?? false);
        }
        if (!tenant.prioritizeRecent || tenant.overridePrioritizeRecent) {
          setPrioritizeRecent(settings.prioritizeRecent ?? false);
        }
        const savedModel = settings.selectedModel;
        const parsed = modelSchema.safeParse(savedModel);
        if (parsed.success && enabledModels.includes(savedModel)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(tenant.defaultModel || enabledModels[0]);
        }
      }
      setSettingsLoaded(true);
    }
  }, [
    enabledModels,
    tenant.overrideBreadth,
    tenant.overrideRerank,
    tenant.overridePrioritizeRecent,
    tenant.defaultModel,
    tenant.isBreadth,
    tenant.rerankEnabled,
    tenant.prioritizeRecent,
  ]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Only save settings that can be overridden
    const settingsToSave = {
      selectedModel,
      ...(tenant.overrideBreadth ? { isBreadth } : {}),
      ...(tenant.overrideRerank ? { rerankEnabled } : {}),
      ...(tenant.overridePrioritizeRecent ? { prioritizeRecent } : {}),
    };

    localStorage.setItem("chatSettings", JSON.stringify(settingsToSave));
  }, [isBreadth, rerankEnabled, prioritizeRecent, selectedModel, tenant]);

  // Measure bottom nav height and set CSS variable
  useEffect(() => {
    const nav = document.querySelector("[data-bottom-nav]") as HTMLElement | null;
    const setVar = () => {
      const h = nav?.offsetHeight ?? 80;
      document.documentElement.style.setProperty("--bottom-nav-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  const handleSubmit = async (content: string, model: LLMModel = DEFAULT_MODEL) => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({
        content,
      }),
      headers: {
        tenant: tenant.slug,
      },
    });
    if (!res.ok) throw new Error("Could not create conversation");

    const json = await res.json();
    const conversation = conversationResponseSchema.parse(json);
    setInitialMessage(content);
    setInitialModel(model);
    // Store the settings in localStorage so they can be retrieved in the conversation page
    localStorage.setItem(
      "initialSettings",
      JSON.stringify({
        isBreadth,
        rerankEnabled,
        prioritizeRecent,
      }),
    );

    // Invalidate the conversations query to trigger a refetch
    await queryClient.invalidateQueries({ queryKey: ["conversations", tenant.slug] });

    router.push(getConversationPath(tenant.slug, conversation.id));
  };

  const questions = [tenant.question1, tenant.question2, tenant.question3].filter(
    (question): question is string => question !== null && question.trim() !== "",
  );

  return (
    <ProfileProvider profile={profile}>
      <div className={className}>
        {isMounted ? (
          <>
            <div className={`flex flex-col ${inter.className}`}>
              <div>
                {/* Replace tenant/organization logo ONLY on this page */}
                <Image
                  src="/agent-linelead.png"
                  alt="Line Lead"
                  width={96}
                  height={96}
                  className="rounded-md"
                  priority
                />
              </div>
              <h1 className="text-3xl lg:text-[40px] font-bold leading-[50px] text-[#343A40] py-2 lg:py-3">
                {(tenant.welcomeMessage || DEFAULT_WELCOME_MESSAGE).replace("{{company.name}}", tenant.name)}
              </h1>
              {questions.length > 0 && (
                <div className="flex flex-col md:flex-row items-stretch justify-evenly space-y-4 md:space-y-0 md:space-x-2">
                  {questions.map((question, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-4 w-full md:w-1/3 h-full cursor-pointer ${
                        !settingsLoaded ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => settingsLoaded && handleSubmit(question, selectedModel)}
                    >
                      {question}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ll-composer w-full flex flex-col items-center p-2 pl-4 bg-white">
              <ChatInput
                handleSubmit={handleSubmit}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                isBreadth={isBreadth}
                onBreadthChange={setIsBreadth}
                rerankEnabled={rerankEnabled}
                onRerankChange={setRerankEnabled}
                prioritizeRecent={prioritizeRecent}
                onPrioritizeRecentChange={setPrioritizeRecent}
                enabledModels={enabledModels}
                canSetIsBreadth={tenant.overrideBreadth ?? true}
                canSetRerankEnabled={tenant.overrideRerank ?? true}
                canSetPrioritizeRecent={tenant.overridePrioritizeRecent ?? true}
                tenantPaidStatus={tenant.paidStatus}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col w-full p-4 max-w-[717px]">
              <div className="flex items-start mb-6">
                <Skeleton className="h-[100px] w-[100px] rounded-full" />
              </div>
              <Skeleton className="h-[50px] w-[600px] mb-12" />
            </div>
          </div>
        )}
      </div>
    </ProfileProvider>
  );
}
