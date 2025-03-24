import { openai } from "@ai-sdk/openai";
import { CoreMessage, streamObject } from "ai";

import { LLMModel, LLMProvider, PROVIDER_MODELS } from "../types";

import { GenerateOptions, LLMProvider as BaseLLMProvider } from "./base";

export class OpenAIProvider implements BaseLLMProvider {
  async generateStream(messages: CoreMessage[], options: GenerateOptions) {
    return streamObject({
      messages,
      model: openai("gpt-4o"), // TODO: Make model configurable
      temperature: options.temperature ?? 0.3,
      schema: options.schema,
      onFinish: options.onFinish,
    });
  }

  validateModel(model: LLMModel): boolean {
    return PROVIDER_MODELS.openai.includes(model);
  }

  getSupportedModels(): LLMModel[] {
    return PROVIDER_MODELS.openai;
  }
}
