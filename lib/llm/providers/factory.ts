import { LLMModel, LLMProvider, PROVIDER_MODELS } from "../types";

import { LLMProvider as BaseLLMProvider } from "./base";
import { OpenAIProvider } from "./openai";

const providers: Record<LLMProvider, BaseLLMProvider> = {
  openai: new OpenAIProvider(),
  // TODO: Add other providers
  google: new OpenAIProvider(), // Placeholder
  anthropic: new OpenAIProvider(), // Placeholder
};

export function getProvider(model: LLMModel): BaseLLMProvider {
  const entries = Object.entries(PROVIDER_MODELS) as [LLMProvider, readonly LLMModel[]][];
  const provider = entries.find(([_, models]) => models.includes(model))?.[0];

  if (!provider) {
    throw new Error(`No provider found for model: ${model}`);
  }

  return providers[provider];
}
