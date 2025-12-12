"use client";

import { useState, useEffect, useMemo } from "react";

import { LLMModel, modelSchema, getEnabledModelsFromDisabled, DEFAULT_MODEL } from "@/lib/llm/types";
import * as schema from "@/lib/server/db/schema";

type RetrievalMode = "breadth" | "depth" | "agentic";
type AgenticLevel = "low" | "medium" | "high";

interface SearchSettings {
  retrievalMode: RetrievalMode;
  selectedModel: LLMModel;
  rerankEnabled: boolean;
  prioritizeRecent: boolean;
  agenticLevel: AgenticLevel;
}

interface SearchSettingsActions {
  setRetrievalMode: (mode: RetrievalMode) => void;
  setSelectedModel: (model: LLMModel) => void;
  setRerankEnabled: (enabled: boolean) => void;
  setPrioritizeRecent: (enabled: boolean) => void;
  setAgenticLevel: (level: AgenticLevel) => void;
}

interface UseSearchSettingsOptions {
  tenant: typeof schema.tenants.$inferSelect;
  /**
   * When true, disables all user-facing settings controls.
   * Used for embedded/simplified chat experiences.
   */
  simplified?: boolean;
}

interface UseSearchSettingsReturn extends SearchSettings, SearchSettingsActions {
  enabledModels: LLMModel[];
  canSetIsBreadth: boolean;
  canSetRerankEnabled: boolean;
  canSetPrioritizeRecent: boolean;
  canSetAgenticLevel: boolean;
  isSettingsLoaded: boolean;
  canUseAgentic: boolean;
}

export function useSearchSettings({ tenant, simplified = false }: UseSearchSettingsOptions): UseSearchSettingsReturn {
  const enabledModels = useMemo(() => getEnabledModelsFromDisabled(tenant.disabledModels), [tenant.disabledModels]);

  // State variables
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.retrievalMode) {
          return settings.retrievalMode;
        }
        // Legacy support for isBreadth boolean
        if (settings.isBreadth !== undefined) {
          return settings.isBreadth ? "breadth" : "depth";
        }
      }
    }
    return tenant.isBreadth ? "breadth" : "depth";
  });

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
      return firstModel;
    }
    return DEFAULT_MODEL;
  });

  const [rerankEnabled, setRerankEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.rerankEnabled ?? false;
      }
    }
    return tenant.rerankEnabled ?? false;
  });

  const [prioritizeRecent, setPrioritizeRecent] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.prioritizeRecent ?? false;
      }
    }
    return tenant.prioritizeRecent ?? false;
  });

  const [agenticLevel, setAgenticLevel] = useState<AgenticLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.agenticLevel || "medium";
      }
    }
    return "medium";
  });

  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Computed values for override permissions
  // When simplified mode is enabled, all user-facing controls are disabled
  const canSetIsBreadth = simplified ? false : (tenant.overrideBreadth ?? true);
  const canSetRerankEnabled = simplified ? false : (tenant.overrideRerank ?? true);
  const canSetPrioritizeRecent = simplified ? false : (tenant.overridePrioritizeRecent ?? true);
  const canSetAgenticLevel = simplified ? false : (tenant.overrideAgenticLevel ?? true);
  const canUseAgentic = simplified ? false : tenant.agenticLevel !== "disabled";

  // Load settings from localStorage after initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatSettings");
      if (saved) {
        const settings = JSON.parse(saved);

        // Apply user settings only if overrides are allowed
        if (canSetIsBreadth || canUseAgentic) {
          if (settings.retrievalMode) {
            setRetrievalMode(settings.retrievalMode);
          } else if (settings.isBreadth !== undefined) {
            // Legacy support
            setRetrievalMode(settings.isBreadth ? "breadth" : "depth");
          }
        }

        if (canSetRerankEnabled) {
          setRerankEnabled(settings.rerankEnabled ?? false);
        }

        if (canSetPrioritizeRecent) {
          setPrioritizeRecent(settings.prioritizeRecent ?? false);
        }

        if (canSetAgenticLevel) {
          setAgenticLevel(settings.agenticLevel || "medium");
        }

        // Model selection is always allowed
        const savedModel = settings.selectedModel;
        const parsed = modelSchema.safeParse(savedModel);
        if (parsed.success && enabledModels.includes(savedModel)) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(tenant.defaultModel || enabledModels[0]);
        }
      }
      setIsSettingsLoaded(true);
    }
  }, [
    enabledModels,
    canSetIsBreadth,
    canSetRerankEnabled,
    canSetPrioritizeRecent,
    canSetAgenticLevel,
    tenant.defaultModel,
  ]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isSettingsLoaded) return;

    const settingsToSave = {
      selectedModel,
      ...(canSetIsBreadth || canUseAgentic
        ? {
            isBreadth: retrievalMode === "breadth",
            retrievalMode: retrievalMode,
          }
        : {}),
      ...(canSetRerankEnabled ? { rerankEnabled } : {}),
      ...(canSetPrioritizeRecent ? { prioritizeRecent } : {}),
      ...(canSetAgenticLevel ? { agenticLevel } : {}),
    };

    localStorage.setItem("chatSettings", JSON.stringify(settingsToSave));
  }, [
    retrievalMode,
    rerankEnabled,
    prioritizeRecent,
    agenticLevel,
    selectedModel,
    canSetIsBreadth,
    canSetRerankEnabled,
    canSetPrioritizeRecent,
    canSetAgenticLevel,
    isSettingsLoaded,
  ]);

  return {
    // State
    retrievalMode,
    selectedModel,
    rerankEnabled,
    prioritizeRecent,
    agenticLevel,

    // Actions
    setRetrievalMode,
    setSelectedModel,
    setRerankEnabled,
    setPrioritizeRecent,
    setAgenticLevel,

    // Computed values
    enabledModels,
    canSetIsBreadth,
    canSetRerankEnabled,
    canSetPrioritizeRecent,
    canSetAgenticLevel,
    isSettingsLoaded,
    canUseAgentic,
  };
}
