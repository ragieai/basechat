// Single source of truth for providers and their models
export const PROVIDER_CONFIG = {
  openai: {
    models: ["gpt-4o", "gpt-3.5-turbo"] as const,
    logo: "/openai.svg",
  },
  google: {
    models: ["gemini-flash-2.0", "gemini-pro"] as const,
    logo: "/gemini.svg",
  },
  anthropic: {
    models: ["claude-sonnet-3.7", "claude-opus-3"] as const,
    logo: "/anthropic.svg",
  },
} as const;

// Default values
export const DEFAULT_MODEL = "gpt-4o";
export const DEFAULT_PROVIDER = "openai";

// Derive types from the config
export type LLMProvider = keyof typeof PROVIDER_CONFIG;
export type LLMModel = (typeof PROVIDER_CONFIG)[LLMProvider]["models"][number];
export type ProviderModels<T extends LLMProvider> = (typeof PROVIDER_CONFIG)[T]["models"][number];

// Runtime mappings
export const PROVIDER_MODELS = {
  openai: PROVIDER_CONFIG.openai.models,
  google: PROVIDER_CONFIG.google.models,
  anthropic: PROVIDER_CONFIG.anthropic.models,
} as const;

export const ALL_VALID_MODELS = Object.values(PROVIDER_CONFIG).flatMap((config) => config.models) as LLMModel[];

// Helper functions
export function isModelSupportedByProvider(model: LLMModel, provider: LLMProvider): boolean {
  return (PROVIDER_CONFIG[provider].models as readonly string[]).includes(model);
}

export function getProviderForModel(model: LLMModel): LLMProvider | null {
  for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
    if ((config.models as readonly string[]).includes(model)) {
      return provider as LLMProvider;
    }
  }
  return null;
}

// Logo mapping
export const LLM_LOGO_MAP = Object.fromEntries(
  ALL_VALID_MODELS.map((model) => [model, [model, PROVIDER_CONFIG[getProviderForModel(model)!].logo]]),
) as Record<LLMModel, [string, string]>;
