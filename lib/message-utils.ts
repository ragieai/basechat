import { convertV4MessageToV5, convertV5MessageToV4 } from "./convert-messages";
import { ExtendedUIMessage, MyUIMessage } from "./types/messages";

// Helper function to get text content from v5 UIMessage
export function getMessageText(message: MyUIMessage | ExtendedUIMessage): string {
  if (!message.parts) return "";

  for (const part of message.parts) {
    if (part.type === "text") {
      return part.text;
    }
  }
  return "";
} // Helper function to create a text message in v5 format
export function createTextMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
  metadata?: Partial<ExtendedUIMessage>,
): ExtendedUIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
    ...metadata,
  };
}

// Helper function to convert database message (with content field) to UIMessage using official conversion
export function dbMessageToUIMessage(dbMessage: any): ExtendedUIMessage {
  // If it already has parts, it might be v4 format - use official converter
  if (dbMessage.parts || dbMessage.toolInvocations || dbMessage.reasoning) {
    const converted = convertV4MessageToV5(dbMessage, 0);
    return {
      ...converted,
      sources: dbMessage.sources,
      model: dbMessage.model,
      type: dbMessage.type,
    };
  }

  // Otherwise it's a simple content-only message, convert directly
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    parts: [{ type: "text", text: dbMessage.content || "" }],
    sources: dbMessage.sources,
    model: dbMessage.model,
    type: dbMessage.type,
  };
}

// Helper function to convert UIMessage back to database format (with content field) using official conversion
export function uiMessageToDbMessage(uiMessage: ExtendedUIMessage) {
  const v4Message = convertV5MessageToV4(uiMessage);
  return {
    id: v4Message.id,
    role: v4Message.role,
    content: v4Message.content,
    parts: v4Message.parts,
    sources: uiMessage.sources,
    model: uiMessage.model,
    type: uiMessage.type,
    // Preserve any v4 fields that might exist
    toolInvocations: v4Message.toolInvocations,
    reasoning: v4Message.reasoning,
    data: v4Message.data,
  };
}
