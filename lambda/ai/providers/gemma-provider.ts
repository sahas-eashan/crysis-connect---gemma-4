import { generateWithHostedGemma } from "./hosted-gemma-provider.js";
import { generateWithLocalGemma } from "./local-gemma-provider.js";
import type {
  GemmaRuntimeMetadata,
  GenerateStructuredJsonRequest,
  GenerateStructuredJsonResult
} from "./provider-types.js";
import { GemmaProviderError } from "./provider-types.js";

export const AI_PROVIDER = process.env.AI_PROVIDER ?? "gemma";
export const GEMMA_RUNTIME = process.env.GEMMA_RUNTIME ?? "ollama";
export const GEMMA_ENDPOINT = process.env.GEMMA_ENDPOINT ?? "http://localhost:11434";
export const GEMMA_INTERACTIVE_MODEL = process.env.GEMMA_INTERACTIVE_MODEL ?? "gemma4:e4b";
export const GEMMA_ANALYSIS_MODEL = process.env.GEMMA_ANALYSIS_MODEL ?? "gemma4:e4b";
export const GEMMA_FINETUNED_MODEL = process.env.GEMMA_FINETUNED_MODEL ?? "";
export const GEMMA_MODEL_VERSION = process.env.GEMMA_MODEL_VERSION;
export const GEMMA_ADAPTER_VERSION = process.env.GEMMA_ADAPTER_VERSION;
export const GEMMA_MODE = process.env.GEMMA_MODE ?? "local_first";
export const AI_ALLOW_CLOUD_FALLBACK = process.env.AI_ALLOW_CLOUD_FALLBACK === "true";

export function getGemmaRuntimeMetadata(modelName?: string): GemmaRuntimeMetadata {
  return {
    modelName,
    modelVersion: GEMMA_MODEL_VERSION,
    adapterVersion: GEMMA_ADAPTER_VERSION || (GEMMA_FINETUNED_MODEL ? GEMMA_FINETUNED_MODEL : undefined),
    runtime: GEMMA_RUNTIME === "hosted" ? "cloud" : "edge_gateway",
    offlineMode: false
  };
}

export async function generateStructuredJson<T>(
  request: GenerateStructuredJsonRequest
): Promise<GenerateStructuredJsonResult<T>> {
  if (AI_PROVIDER !== "gemma") {
    throw new GemmaProviderError(`Unsupported AI_PROVIDER '${AI_PROVIDER}'. Module A supports AI_PROVIDER=gemma.`, {
      code: "UNSUPPORTED_AI_PROVIDER"
    });
  }

  if (GEMMA_RUNTIME === "ollama") {
    return generateWithLocalGemma<T>(request, {
      endpoint: GEMMA_ENDPOINT,
      modelVersion: GEMMA_MODEL_VERSION,
      adapterVersion: GEMMA_ADAPTER_VERSION || (GEMMA_FINETUNED_MODEL ? GEMMA_FINETUNED_MODEL : undefined)
    });
  }

  if (GEMMA_RUNTIME === "hosted" && AI_ALLOW_CLOUD_FALLBACK) {
    return generateWithHostedGemma<T>(request);
  }

  throw new GemmaProviderError(`Unsupported GEMMA_RUNTIME '${GEMMA_RUNTIME}'. Use 'ollama' for Module A.`, {
    code: "UNSUPPORTED_GEMMA_RUNTIME"
  });
}
