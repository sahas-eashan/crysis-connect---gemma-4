import type { GenerateStructuredJsonRequest, GenerateStructuredJsonResult } from "./provider-types.js";
import { GemmaProviderError } from "./provider-types.js";

function createSchemaInstruction(schema: Record<string, unknown>) {
  return JSON.stringify(schema);
}

function extractJsonText(text: string) {
  const trimmed = text.trim();

  // Ollama is asked for JSON mode, but model output can still include fences or
  // prose. Normalize the response before validation so transient formatting does
  // not break operational workflows.
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    if (withoutFence) return withoutFence;
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1);
  }

  return trimmed;
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

/**
 * Sends a structured JSON task to an Ollama-compatible Gemma endpoint.
 *
 * In local development this endpoint is usually http://localhost:11434. In AWS,
 * it must be a gateway that Lambda can reach; Lambda localhost is not the
 * developer machine.
 */
export async function generateWithLocalGemma<T>(
  request: GenerateStructuredJsonRequest,
  options: {
    endpoint: string;
    modelVersion?: string;
    adapterVersion?: string;
  }
): Promise<GenerateStructuredJsonResult<T>> {
  if (!options.endpoint.trim()) {
    throw new GemmaProviderError("Gemma endpoint is not configured.", { code: "GEMMA_ENDPOINT_MISSING" });
  }

  let response: Response;
  try {
    response = await fetch(`${normalizeEndpoint(options.endpoint)}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
          top_p: 0.8
        },
        messages: [
          {
            role: "system",
            content: request.systemInstruction
          },
          {
            role: "user",
            content: `${request.prompt}\n\nReturn JSON only. Follow this schema exactly:\n${createSchemaInstruction(request.schema)}`
          }
        ]
      })
    });
  } catch (error) {
    throw new GemmaProviderError(
      `Gemma runtime is unavailable at ${options.endpoint}. Start Ollama or set GEMMA_ENDPOINT to a reachable Gemma gateway.`,
      {
        code: "GEMMA_RUNTIME_UNAVAILABLE",
        cause: error
      }
    );
  }

  if (!response.ok) {
    const details = await response.text();
    console.error(
      JSON.stringify({
        level: "error",
        taskName: request.taskName,
        model: request.model,
        event: "gemma_http_error",
        statusCode: response.status,
        details: details.slice(0, 600)
      })
    );
    throw new GemmaProviderError(`Gemma request failed with ${response.status}`, {
      statusCode: response.status,
      code: "GEMMA_HTTP_ERROR"
    });
  }

  const payload = (await response.json()) as any;
  const text = String(payload.message?.content ?? "").trim();
  if (!text) {
    console.warn(
      JSON.stringify({
        level: "warn",
        taskName: request.taskName,
        model: request.model,
        event: "gemma_empty_response"
      })
    );
    return {
      value: null,
      modelName: request.model,
      modelVersion: options.modelVersion,
      adapterVersion: options.adapterVersion,
      runtime: "edge_gateway",
      offlineMode: false,
      tokenUsage: typeof payload.eval_count === "number" ? payload.eval_count : null
    };
  }

  try {
    const normalizedText = extractJsonText(text);
    const parsed = JSON.parse(normalizedText) as T;
    console.log(
      JSON.stringify({
        level: "info",
        taskName: request.taskName,
        model: request.model,
        event: "gemma_completed"
      })
    );
    return {
      value: parsed,
      modelName: request.model,
      modelVersion: options.modelVersion,
      adapterVersion: options.adapterVersion,
      runtime: "edge_gateway",
      offlineMode: false,
      tokenUsage: typeof payload.eval_count === "number" ? payload.eval_count : null
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        taskName: request.taskName,
        model: request.model,
        event: "gemma_parse_error",
        rawText: text.slice(0, 600),
        message: error instanceof Error ? error.message : "Unknown parse error"
      })
    );
    throw new GemmaProviderError("Gemma returned invalid JSON for the requested task.", {
      code: "GEMMA_INVALID_JSON",
      cause: error
    });
  }
}
