import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import {
  ModelMessage,
  DeepPartial,
  generateObject,
  LanguageModel,
  streamObject,
  StreamObjectOnFinishCallback,
  StreamObjectResult,
} from "ai";
import { assertNever } from "assert-never";
import { z } from "zod/v3";

import { createConversationMessageResponseSchema } from "@/lib/api";
import { DEFAULT_PROVIDER, getProviderForModel, getModelConfig } from "@/lib/llm/types";

export type ConversationMessageResponse = z.infer<typeof createConversationMessageResponseSchema>;

type GenerateStreamOptions = {
  onFinish: StreamObjectOnFinishCallback<ConversationMessageResponse>;
};

function filterMessages(messages: ModelMessage[]) {
  return messages.filter((msg) => {
    if (!msg.content) return false;
    if (typeof msg.content === "string" && msg.content.trim() === "") return false;
    return true;
  });
}

export interface GenerateContext {
  messages: ModelMessage[];
}

export default interface Generator {
  model: string;

  generateObject(context: GenerateContext): Promise<ConversationMessageResponse>;
  generateStream(
    context: GenerateContext,
    options: GenerateStreamOptions,
  ): StreamObjectResult<DeepPartial<ConversationMessageResponse>, ConversationMessageResponse, never>;
}

export function generatorFactory(model: string): Generator {
  const provider = getProviderForModel(model) ?? DEFAULT_PROVIDER;

  console.log(`Using provider: ${provider} for model: ${model}`);

  switch (provider) {
    case "openai":
      return new OpenAIGenerator(model);
    case "google":
      return new GoogleGenerator(model);
    case "anthropic":
      return new AnthropicGenerator(model);
    case "groq":
      return new GroqGenerator(model);
    default:
      assertNever(provider);
  }
}

export abstract class AbstractGenerator implements Generator {
  constructor(public readonly model: string) {}

  protected abstract _languageModelFactory(model: string): LanguageModel;

  protected _getSystem(): string | undefined {
    const config = getModelConfig(this.model);
    return config?.systemPrompt;
  }

  protected _getTemperature(): number {
    const config = getModelConfig(this.model);
    return config?.temperature ?? 0.3; // Default to 0.3 if no config found
  }

  async generateObject(context: GenerateContext) {
    const model = this._languageModelFactory(this.model);
    const messages = filterMessages(context.messages);

    const { object } = await generateObject({
      messages,
      model,
      temperature: this._getTemperature(),
      system: this._getSystem(),
      output: "object",
      schema: createConversationMessageResponseSchema,
    });

    return object;
  }

  generateStream(context: GenerateContext, options: GenerateStreamOptions) {
    return streamObject({
      messages: filterMessages(context.messages),
      model: this._languageModelFactory(this.model),
      temperature: this._getTemperature(),
      system: this._getSystem(),
      schema: createConversationMessageResponseSchema,
      onFinish: options.onFinish,
    });
  }
}
export abstract class SortedMessageGenerator extends AbstractGenerator {
  async generateObject(context: GenerateContext) {
    const systemMessages = context.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = context.messages.filter((msg) => msg.role !== "system");

    return super.generateObject({
      ...context,
      messages: [...systemMessages, ...nonSystemMessages],
    });
  }

  generateStream(context: GenerateContext, options: GenerateStreamOptions) {
    const systemMessages = context.messages.filter((msg) => msg.role === "system");
    const nonSystemMessages = context.messages.filter((msg) => msg.role !== "system");

    return super.generateStream(
      {
        ...context,
        messages: [...systemMessages, ...nonSystemMessages],
      },
      options,
    );
  }
}

export class AnthropicGenerator extends SortedMessageGenerator {
  _languageModelFactory = (model: string) => anthropic(model);
}

export class GoogleGenerator extends SortedMessageGenerator {
  _languageModelFactory = (model: string) => google(model);
}

export class GroqGenerator extends AbstractGenerator {
  _languageModelFactory = (model: string) => groq(model);
}

export class OpenAIGenerator extends AbstractGenerator {
  _languageModelFactory = (model: string) => openai(model);
}
