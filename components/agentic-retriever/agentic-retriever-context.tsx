"use client";

import React, { createContext, useContext, useCallback, useState, useMemo, ReactNode } from "react";
import { z } from "zod/v3";

import { finalAnswerSchema } from "./types";
import useAgenticRetriever, { AgenticRetriever } from "./use-agentic-retriever";

export interface AgenticRetrieverCallbacks {
  onStart: (payload: { runId: string; query: string; effort: string }) => Promise<void>;
  onDone: (payload: {
    result: z.infer<typeof finalAnswerSchema>;
    runId: string;
    query: string;
    effort: string;
    stepTiming: Array<number>;
  }) => Promise<void>;
  onError: (payload: string) => Promise<void>;
}

export interface AgenticRetrieverContextValue extends AgenticRetriever {
  isActive: boolean;
  registerCallbacks: (callbacks: AgenticRetrieverCallbacks) => () => void;
  unregisterCallbacks: () => void;
}

const AgenticRetrieverContext = createContext<AgenticRetrieverContextValue | null>(null);

export interface AgenticRetrieverProviderProps {
  children: ReactNode;
  tenantSlug: string;
}
export function AgenticRetrieverProvider({ children, tenantSlug }: AgenticRetrieverProviderProps) {
  const [registeredCallbacks, setRegisteredCallbacks] = useState<AgenticRetrieverCallbacks | null>(null);

  const activeCallbacks = registeredCallbacks || {
    onStart: async () => {},
    onDone: async () => {},
    onError: async () => {},
  };

  const agenticRetriever = useAgenticRetriever({
    tenantSlug,
    onStart: activeCallbacks.onStart,
    onDone: activeCallbacks.onDone,
    onError: activeCallbacks.onError,
  });

  const registerCallbacks = useCallback((callbacks: AgenticRetrieverCallbacks) => {
    setRegisteredCallbacks(callbacks);
    return () => setRegisteredCallbacks(null);
  }, []);

  const unregisterCallbacks = useCallback(() => {
    setRegisteredCallbacks(null);
  }, []);

  const contextValue: AgenticRetrieverContextValue = useMemo(
    () => ({
      ...agenticRetriever,
      isActive: agenticRetriever.status !== "idle",
      registerCallbacks,
      unregisterCallbacks,
    }),
    [agenticRetriever, registerCallbacks, unregisterCallbacks],
  );

  return <AgenticRetrieverContext.Provider value={contextValue}>{children}</AgenticRetrieverContext.Provider>;
}

export function useAgenticRetrieverContext(): AgenticRetrieverContextValue {
  const context = useContext(AgenticRetrieverContext);

  if (!context) {
    throw new Error("useAgenticRetrieverContext must be used within an AgenticRetrieverProvider");
  }

  return context;
}

export function useAgenticRetrieverContextOptional(): AgenticRetrieverContextValue | null {
  return useContext(AgenticRetrieverContext);
}
