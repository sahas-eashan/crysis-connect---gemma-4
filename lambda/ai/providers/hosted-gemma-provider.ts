import type { GenerateStructuredJsonRequest, GenerateStructuredJsonResult } from "./provider-types.js";
import { GemmaProviderError } from "./provider-types.js";

export async function generateWithHostedGemma<T>(
  _request: GenerateStructuredJsonRequest
): Promise<GenerateStructuredJsonResult<T>> {
  throw new GemmaProviderError("Hosted Gemma runtime is not enabled in Module A.", {
    code: "HOSTED_GEMMA_NOT_ENABLED"
  });
}
