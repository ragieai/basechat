import { openai } from "@ai-sdk/openai";
import { CoreMessage, streamObject, StreamObjectResult } from "ai";

import { LLMModel, LLMProvider, PROVIDER_MODELS, ProviderModels } from "../types";

import { GenerateOptions, LLMProvider as BaseLLMProvider } from "./base";

interface StreamResponse {
  model?: LLMModel;
  [key: string]: any;
}

export class OpenAIProvider implements BaseLLMProvider {
  async generateStream(
    messages: CoreMessage[],
    options: GenerateOptions,
  ): Promise<StreamObjectResult<StreamResponse, any, never>> {
    if (!this.validateModel(options.model)) {
      throw new Error(`Model ${options.model} is not supported by OpenAI provider`);
    }

    return streamObject<StreamResponse>({
      messages,
      model: openai(options.model),
      temperature: options.temperature ?? 0.3,
      schema: options.schema,
      onFinish: async (event) => {
        if (!event.object) return;
        event.object.model = options.model;
        await options.onFinish?.(event);
      },
    });
  }

  validateModel(model: LLMModel): boolean {
    return PROVIDER_MODELS.openai.includes(model as ProviderModels<"openai">);
  }

  getSupportedModels(): LLMModel[] {
    return [...PROVIDER_MODELS.openai];
  }
}
