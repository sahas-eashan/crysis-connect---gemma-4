export type GemmaRuntimeTarget = "on_device" | "edge_gateway" | "command_center" | "cloud";

export type GenerateStructuredJsonRequest = {
  taskName: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
};

export type GenerateStructuredJsonResult<T> = {
  value: T | null;
  modelName: string;
  modelVersion?: string;
  adapterVersion?: string;
  runtime: GemmaRuntimeTarget;
  offlineMode: boolean;
  tokenUsage: number | null;
};

export type GemmaRuntimeMetadata = {
  modelName?: string;
  modelVersion?: string;
  adapterVersion?: string;
  runtime: GemmaRuntimeTarget;
  offlineMode: boolean;
};

export class GemmaProviderError extends Error {
  statusCode?: number;
  code?: string;

  constructor(message: string, options?: { statusCode?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = "GemmaProviderError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
    this.cause = options?.cause;
  }
}
