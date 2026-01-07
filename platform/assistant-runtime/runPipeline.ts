import { callOpenRouter } from "@/shared/lib/openrouter";
import { normalizeAssistantResult } from "@/platform/artifacts/normalize";
import type {
  AssistantProfile,
  AssistantRunRequest,
} from "@/platform/assistant-runtime/types";
import type { AssistantResult } from "@/platform/artifacts/types";
import { getPromptTemplate } from "@/platform/assistant-runtime/promptRegistry";
import type { RunRecord } from "@/platform/storage/types";
import { createId } from "@/shared/lib/id";

const extractJsonPayload = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  throw new Error("Model response did not contain JSON");
};

export type RunPipelineResult = {
  run: RunRecord;
  promptSnapshot: { system: string; user: string };
  prepResult?: unknown;
  outline?: string[];
};

export const runAssistantPipeline = async (params: {
  request: AssistantRunRequest;
  profile: AssistantProfile;
  apiKey: string;
  model: string;
  persistRun?: (run: RunRecord) => void;
}): Promise<RunPipelineResult> => {
  const { request, profile, apiKey, model, persistRun } = params;
  const template = getPromptTemplate(profile.promptTemplateId);
  if (!template) {
    throw new Error(`Prompt template not found: ${profile.promptTemplateId}`);
  }

  const inputsValidation = profile.inputSchema.safeParse(request.inputs || {});
  if (!inputsValidation.success) {
    throw new Error("Invalid assistant inputs");
  }

  const validatedInputs =
    inputsValidation.data && typeof inputsValidation.data === "object"
      ? (inputsValidation.data as Record<string, unknown>)
      : {};

  const prompt = template.build({
    document: request.document,
    inputs: validatedInputs,
  });

  const promptSnapshot = {
    system: prompt.systemPrompt,
    user: prompt.userPrompt,
  };

  const now = new Date().toISOString();
  const runBase: RunRecord = {
    id: createId(),
    documentId: request.documentId,
    inputDocumentVersionId: request.document.versionId,
    assistantProfileId: profile.id,
    assistantProfileVersionId: profile.versionId,
    action: request.action,
    status: "running",
    promptSnapshot,
    createdAt: now,
    updatedAt: now,
  };

  if (request.dryRun) {
    const dryRun: RunRecord = {
      ...runBase,
      status: "succeeded",
      updatedAt: new Date().toISOString(),
      result: { findings: [], artifacts: [] },
    };
    return {
      run: dryRun,
      promptSnapshot,
      prepResult: prompt.prepResult,
      outline: prompt.outline,
    };
  }

  const start = Date.now();

  try {
    const rawResponse = await callOpenRouter({
      apiKey,
      model,
      temperature: profile.llm.temperature ?? 0.25,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt },
      ],
    });

    const jsonPayload = extractJsonPayload(rawResponse);
    const parsed = JSON.parse(jsonPayload);
    const validated = profile.outputSchema.parse(parsed);
    const normalizedInput = profile.normalizeOutput
      ? profile.normalizeOutput(validated)
      : (validated as AssistantResult);
    const normalized = normalizeAssistantResult(normalizedInput);

    const run: RunRecord = {
      ...runBase,
      status: "succeeded",
      rawResponse,
      result: normalized,
      metrics: {
        durationMs: Date.now() - start,
      },
      updatedAt: new Date().toISOString(),
    };

    persistRun?.(run);

    return {
      run,
      promptSnapshot,
      prepResult: prompt.prepResult,
      outline: prompt.outline,
    };
  } catch (error) {
    const run: RunRecord = {
      ...runBase,
      status: "failed",
      error: error instanceof Error ? error.message : "Assistant run failed",
      metrics: {
        durationMs: Date.now() - start,
      },
      updatedAt: new Date().toISOString(),
    };

    persistRun?.(run);

    return {
      run,
      promptSnapshot,
      prepResult: prompt.prepResult,
      outline: prompt.outline,
    };
  }
};
