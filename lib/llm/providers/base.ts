import { CoreMessage, streamObject } from "ai";

import { LLMModel } from "../types";

export interface GenerateOptions {
  temperature?: number;
  schema?: any;
  onFinish?: (event: { object: any }) => Promise<void>;
}

export interface LLMProvider {
  generateStream(messages: CoreMessage[], options: GenerateOptions): Promise<ReturnType<typeof streamObject>>;
  validateModel(model: LLMModel): boolean;
  getSupportedModels(): LLMModel[];
}
