import { z } from "zod";
import { lintResponseSchema } from "@/shared/lib/schemas";
import type { AssistantProfile } from "@/platform/assistant-runtime/types";
import type { AssistantResult, Finding } from "@/platform/artifacts/types";

const qaEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const lintInputSchema = z.object({
  qaContext: z.array(qaEntrySchema).optional(),
});

export const LINT_PROMPT_TEMPLATE_ID = "lint-v1";
export const LINT_PROMPT_TEMPLATE_VERSION = "1.0.0";

const lintResponseToAssistantResult = (
  response: unknown
): AssistantResult => {
  const parsed = lintResponseSchema.parse(response);
  const issueFindings: Finding[] = parsed.issues.map((issue) => {
    const severity: Finding["severity"] =
      issue.severity === "blocker"
        ? "error"
        : issue.severity === "warning"
          ? "warn"
          : "info";
    return {
      id: issue.id,
      severity,
      kind: "issue",
      message: issue.message,
      suggestion: issue.fix_suggestion,
      category: issue.category,
      anchor: {
        quote: issue.quote,
        startHint: issue.startHint,
        endHint: issue.endHint,
      },
      source: "ai",
    };
  });

  const questionFindings: Finding[] = parsed.questions.map((question) => {
    const severity: Finding["severity"] =
      question.severity === "blocker" ? "error" : "warn";
    return {
      id: question.id,
      severity,
      kind: "question",
      message: question.question,
      suggestion: question.reason,
      source: "ai",
    };
  });

  const findings = [...issueFindings, ...questionFindings];

  return { findings, artifacts: [] };
};

export const lintProfile: AssistantProfile = {
  id: "assistant-lint-v1",
  name: "Document Lint",
  docTypes: ["business", "technical"],
  actions: ["lint"],
  promptTemplateId: LINT_PROMPT_TEMPLATE_ID,
  promptTemplateVersion: LINT_PROMPT_TEMPLATE_VERSION,
  llm: {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    temperature: 0.25,
  },
  inputSchema: lintInputSchema,
  outputSchema: lintResponseSchema,
  normalizeOutput: lintResponseToAssistantResult,
  uiSchema: {
    title: "Lint document",
    description: "Find gaps, ambiguities, and risks.",
    fields: [],
  },
  versionId: "1.0.0",
};
export const assistantProfiles: AssistantProfile[] = [lintProfile];
