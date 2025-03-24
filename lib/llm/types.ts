export type LLMProvider = "openai" | "google" | "anthropic";

// Type-safe mapping of providers to their supported models
export type ProviderModelMap = {
  openai: ["gpt-4o", "gpt-3.5-turbo"];
  google: ["gemini-flash-2.0", "gemini-pro"];
  anthropic: ["claude-sonnet-3.7", "claude-opus-3"];
};

// Derive LLMModel type from ProviderModelMap
export type LLMModel = ProviderModelMap[LLMProvider][number];

// Helper type to get all models for a provider
export type ProviderModels<T extends LLMProvider> = ProviderModelMap[T][number];

// Runtime mapping of providers to their supported models
export const PROVIDER_MODELS: Record<LLMProvider, LLMModel[]> = {
  openai: ["gpt-4o", "gpt-3.5-turbo"],
  google: ["gemini-flash-2.0", "gemini-pro"],
  anthropic: ["claude-sonnet-3.7", "claude-opus-3"],
} as const;

// Create a flat array of all valid models from all providers
export const ALL_VALID_MODELS = Object.values(PROVIDER_MODELS).flat() as LLMModel[];

// Helper function to check if a model is supported by a provider
export function isModelSupportedByProvider(model: LLMModel, provider: LLMProvider): boolean {
  return PROVIDER_MODELS[provider].includes(model);
}

// Helper function to get the provider for a given model
export function getProviderForModel(model: LLMModel): LLMProvider | null {
  for (const [provider, models] of Object.entries(PROVIDER_MODELS)) {
    if (models.includes(model)) {
      return provider as LLMProvider;
    }
  }
  return null;
}

// Provider logos
const PROVIDER_LOGOS = {
  openai: "/openai.svg",
  google: "/gemini.svg",
  anthropic: "/anthropic.svg",
} as const;

// map LLMModel to tuple of [name, logo svg]
export const LLM_LOGO_MAP = Object.fromEntries(
  ALL_VALID_MODELS.map((model) => [model, [model, PROVIDER_LOGOS[getProviderForModel(model)!]]]),
) as Record<LLMModel, [string, string]>;
