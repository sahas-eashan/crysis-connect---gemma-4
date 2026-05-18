import type { GenerateStructuredJsonRequest, GenerateStructuredJsonResult } from "./provider-types.js";
import { GemmaProviderError } from "./provider-types.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
export const GEMINI_INTERACTIVE_MODEL = process.env.GEMINI_INTERACTIVE_MODEL ?? "gemini-2.5-flash";
export const GEMINI_ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.5-pro";

type GeminiHttpError = Error & {
  statusCode?: number;
};

function createSchemaInstruction(schema: Record<string, unknown>) {
  return JSON.stringify(schema);
}

function mapSchemaPrimitive(value: string) {
  if (value === "string|null") {
    return {
      type: "string",
      nullable: true
    };
  }

  if (["string", "number", "integer", "boolean", "null"].includes(value)) {
    return { type: value };
  }

  return { type: "string" };
}

function toGeminiSchema(schema: unknown): Record<string, unknown> {
  if (Array.isArray(schema)) {
    return {
      type: "array",
      items: toGeminiSchema(schema[0] ?? "string")
    };
  }

  if (typeof schema === "string") {
    return mapSchemaPrimitive(schema);
  }

  if (schema && typeof schema === "object") {
    const entries = Object.entries(schema);
    return {
      type: "object",
      properties: Object.fromEntries(entries.map(([key, value]) => [key, toGeminiSchema(value)])),
      required: entries.map(([key]) => key)
    };
  }

  return { type: "string" };
}

function extractJsonText(text: string) {
  const trimmed = text.trim();

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

export async function generateWithGemini<T>({
  taskName,
  model,
  systemInstruction,
  prompt,
  schema
}: GenerateStructuredJsonRequest): Promise<GenerateStructuredJsonResult<T>> {
  if (!GEMINI_API_KEY) {
    throw new GemmaProviderError("GEMINI_API_KEY is not configured.", { code: "MISSING_API_KEY" });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${prompt}\n\nReturn JSON only. Follow this schema exactly:\n${createSchemaInstruction(schema)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(schema)
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error(
      JSON.stringify({
        level: "error",
        taskName,
        model,
        event: "gemini_http_error",
        statusCode: response.status,
        details: details.slice(0, 600)
      })
    );
    const error = new GemmaProviderError(`Gemini request failed with ${response.status}`, { statusCode: response.status });
    throw error;
  }

  const payload = (await response.json()) as any;
  const finishReason = payload.candidates?.[0]?.finishReason ?? null;
  const text = payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("")?.trim();
  
  if (!text) {
    console.warn(
      JSON.stringify({
        level: "warn",
        taskName,
        model,
        event: "gemini_empty_response",
        finishReason,
        promptFeedback: payload.promptFeedback ?? null
      })
    );
    throw new GemmaProviderError("Gemini returned an empty response");
  }

  try {
    const normalizedText = extractJsonText(text);
    const parsed = JSON.parse(normalizedText) as T;
    console.log(
      JSON.stringify({
        level: "info",
        taskName,
        model,
        event: "gemini_completed",
        finishReason
      })
    );
    
    return {
      value: parsed,
      modelName: model,
      runtime: "cloud",
      offlineMode: false,
      tokenUsage: payload.usageMetadata?.totalTokenCount ?? null
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        taskName,
        model,
        event: "gemini_parse_error",
        finishReason,
        rawText: text.slice(0, 600),
        message: error instanceof Error ? error.message : "Unknown parse error"
      })
    );
    throw new GemmaProviderError(error instanceof Error ? error.message : "Unknown parse error");
  }
}
