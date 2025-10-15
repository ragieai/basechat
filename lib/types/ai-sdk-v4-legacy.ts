/**
 * Legacy AI SDK v4 types for backward compatibility during migration.
 * These types are extracted from ai-legacy@4.3.19 to avoid peer dependency conflicts.
 */

// Re-export ToolCall and ToolResult from provider-utils (these are consistent across versions)
import type { ToolCall, ToolResult } from "@ai-sdk/provider-utils";

/**
 * Legacy JSONValue type for v4 compatibility
 */
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

/**
 * Tool invocation from AI SDK v4
 * Can be in different states: partial-call, call, or result
 */
export type ToolInvocation =
  | ({
      state: "partial-call";
      step?: number;
    } & ToolCall<string, any>)
  | ({
      state: "call";
      step?: number;
    } & ToolCall<string, any>)
  | ({
      state: "result";
      step?: number;
    } & ToolResult<string, any, any>);

/**
 * An attachment that can be sent along with a message.
 */
export interface Attachment {
  /**
   * The name of the attachment, usually the file name.
   */
  name?: string;
  /**
   * A string indicating the media type.
   */
  contentType?: string;
  /**
   * The URL of the attachment.
   */
  url: string;
}

/**
 * Base message interface from AI SDK v4
 */
export interface Message {
  /**
   * A unique identifier for the message.
   */
  id: string;
  /**
   * The timestamp of the message.
   */
  createdAt?: Date;
  /**
   * Text content of the message. Use parts when possible.
   */
  content: string;
  /**
   * Reasoning for the message.
   * @deprecated Use `parts` instead.
   */
  reasoning?: string;
  /**
   * Additional attachments to be sent along with the message.
   */
  experimental_attachments?: Attachment[];
  /**
   * The 'data' role is deprecated.
   */
  role: "system" | "user" | "assistant" | "data";
  /**
   * For data messages.
   * @deprecated Data messages will be removed.
   */
  data?: JSONValue;
  /**
   * Additional message-specific information added on the server via StreamData
   */
  annotations?: JSONValue[] | undefined;
  /**
   * Tool invocations (that can be tool calls or tool results, depending on whether or not the invocation has finished)
   * that the assistant made as part of this message.
   * @deprecated Use `parts` instead.
   */
  toolInvocations?: Array<ToolInvocation>;
  /**
   * The parts of the message. Use this for rendering the message in the UI.
   *
   * Assistant messages can have text, reasoning and tool invocation parts.
   * User messages can have text parts.
   */
  parts?: Array<TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart>;
}

/**
 * UI Message extends Message with required parts array
 */
export type UIMessage = Message & {
  /**
   * The parts of the message. Use this for rendering the message in the UI.
   *
   * Assistant messages can have text, reasoning and tool invocation parts.
   * User messages can have text parts.
   */
  parts: Array<TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart>;
};

/**
 * A text part of a message.
 */
export type TextUIPart = {
  type: "text";
  /**
   * The text content.
   */
  text: string;
};

/**
 * A reasoning part of a message.
 */
export type ReasoningUIPart = {
  type: "reasoning";
  /**
   * The reasoning text.
   */
  reasoning: string;
  /**
   * The details of the reasoning step. Can contain text or tool invocation parts.
   */
  details: Array<TextUIPart | ToolInvocationUIPart>;
};

/**
 * A tool invocation part of a message.
 */
export type ToolInvocationUIPart = {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
};

/**
 * A source part of a message (for citations/references).
 */
export type SourceUIPart = {
  type: "source";
  source: {
    id: string;
    url: string;
    title: string;
    sourceType: "url" | "file" | "knowledge";
  };
};

/**
 * A file part of a message.
 */
export type FileUIPart = {
  type: "file";
  mimeType: string;
  data: string; // Base64 encoded or URL
};

/**
 * A step start part of a message.
 */
export type StepStartUIPart = {
  type: "step-start";
  step: number;
};
