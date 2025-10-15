import type { JSONValue, UIMessage, UITools } from "ai";

// Custom AI SDK v5 UIMessage type with metadata support
export type MyUIMessage = UIMessage<never, { custom: JSONValue }, UITools>;

// Extended message type for this application with additional fields
export type ExtendedUIMessage = MyUIMessage & {
  sources?: any[];
  model?: string;
  type?: "agentic" | "standard";
};
