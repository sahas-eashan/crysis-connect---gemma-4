const fs = require('fs');
let code = fs.readFileSync('lambda/ai/index.ts', 'utf8');

code = code.replace(
  'import {\n  GEMMA_ANALYSIS_MODEL,\n  GEMMA_INTERACTIVE_MODEL,\n  generateStructuredJson,\n  getGemmaRuntimeMetadata\n} from "./providers/gemma-provider.js";',
  'import {\n  GEMMA_ANALYSIS_MODEL,\n  GEMMA_INTERACTIVE_MODEL,\n  generateStructuredJson,\n  getGemmaRuntimeMetadata\n} from "./providers/gemma-provider.js";\nimport {\n  GEMINI_ANALYSIS_MODEL,\n  GEMINI_INTERACTIVE_MODEL,\n  generateWithGemini\n} from "./providers/gemini-provider.js";'
);

code = code.replace(
`async function generateGemmaJson<T>(request: {
  taskName: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
}) {
  const result = await generateStructuredJson<T>(request);
  return result.value;
}`,
`async function generateAiJson<T>(request: {
  taskName: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
}) {
  try {
    const isAnalysis = request.model === GEMMA_ANALYSIS_MODEL;
    const geminiModel = isAnalysis ? GEMINI_ANALYSIS_MODEL : GEMINI_INTERACTIVE_MODEL;
    const result = await generateWithGemini<T>({
      ...request,
      model: geminiModel
    });
    return result;
  } catch (error) {
    console.warn(\`Gemini generation failed for \${request.taskName}, falling back to Gemma:\`, error);
    const result = await generateStructuredJson<T>(request);
    return result;
  }
}`
);

code = code.replace(/const generated = await generateGemmaJson/g, 'const result = await generateAiJson');

code = code.replace(
  /const result = await generateAiJson([^]*?)if \(!generated/g,
  (match, p1) => `const result = await generateAiJson${p1}const generated = result?.value;\n    if (!generated`
);

code = code.replace(
  /const result = await generateAiJson([^]*?)if \(generated/g,
  (match, p1) => `const result = await generateAiJson${p1}const generated = result?.value;\n      if (generated`
);

code = code.replace(/model: GEMMA_INTERACTIVE_MODEL,\n\s*status: "completed",/g, 'model: typeof result !== "undefined" ? result.modelName : GEMMA_INTERACTIVE_MODEL,\n      status: "completed",');
code = code.replace(/model: GEMMA_ANALYSIS_MODEL,\n\s*status: "completed",/g, 'model: typeof result !== "undefined" ? result.modelName : GEMMA_ANALYSIS_MODEL,\n      status: "completed",');
code = code.replace(/model: GEMMA_INTERACTIVE_MODEL,\n\s*status,/g, 'model: typeof result !== "undefined" ? result.modelName : GEMMA_INTERACTIVE_MODEL,\n      status,');
code = code.replace(/model: GEMMA_ANALYSIS_MODEL,\n\s*status,/g, 'model: typeof result !== "undefined" ? result.modelName : GEMMA_ANALYSIS_MODEL,\n      status,');

code = code.replace(/tokenUsage: tokenUsage/g, 'tokenUsage: typeof result !== "undefined" ? result.tokenUsage : tokenUsage');
code = code.replace(/tokenUsage: null\n\s*\}/g, 'tokenUsage: typeof result !== "undefined" ? result.tokenUsage : null\n    }');

code = code.replace(/modelName: overrides\.modelName \?\? gemmaRuntime\.modelName \?\? audit\?\.model,/g, 'modelName: overrides.modelName ?? audit?.model ?? gemmaRuntime.modelName,');
code = code.replace(/runtime: overrides\.runtime \?\? gemmaRuntime\.runtime,/g, 'runtime: overrides.runtime ?? (audit?.model?.startsWith("gemini") ? "cloud" : gemmaRuntime.runtime),');

fs.writeFileSync('lambda/ai/index.ts', code);
console.log('Successfully updated lambda/ai/index.ts');
