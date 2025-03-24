"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

interface GlobalState {
  initialMessage: string;
  setInitialMessage: (content: string) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [initialMessage, setInitialMessage] = useState("");

  return (
    <GlobalStateContext.Provider value={{ initialMessage, setInitialMessage }}>{children}</GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};
