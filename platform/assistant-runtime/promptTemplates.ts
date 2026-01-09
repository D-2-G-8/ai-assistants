import { buildDocumentPromptParts } from "@/shared/lib/document/prompt";
import { BA_REVIEWER_SYSTEM_PROMPT } from "@/shared/lib/ba-reviewer/prompt";
import { tiptapToMarkdown } from "@/shared/lib/text-prep/tiptapToMarkdown";
import type { PromptBuildInput, PromptTemplate } from "@/platform/assistant-runtime/types";
import {
  LINT_PROMPT_TEMPLATE_ID,
  LINT_PROMPT_TEMPLATE_VERSION,
} from "@/platform/assistant-runtime/profiles";

const resolveDocumentText = (input: PromptBuildInput) => {
  const { document, inputs } = input;
  const contentJson = document.content || {};
  const markdown = tiptapToMarkdown(contentJson);
  if (markdown) return markdown;

  const rawText =
    typeof document.contentText === "string" ? document.contentText : undefined;
  if (rawText) return rawText;

  const fallback = inputs?.rawText;
  return typeof fallback === "string" ? fallback : "";
};

export const lintPromptTemplate: PromptTemplate = {
  id: LINT_PROMPT_TEMPLATE_ID,
  version: LINT_PROMPT_TEMPLATE_VERSION,
  build: (input) => {
    const resolvedContent = resolveDocumentText(input);
    const qaContext = (input.inputs?.qaContext || []) as Array<{
      id: string;
      question: string;
      answer: string;
    }>;
    const promptParts = buildDocumentPromptParts({
      title: input.document.title,
      content: resolvedContent,
      qaContext,
    });

    return {
      systemPrompt: BA_REVIEWER_SYSTEM_PROMPT,
      userPrompt: promptParts.userPrompt,
      prepResult: promptParts.prepResult,
      outline: promptParts.outline,
    };
  },
};

export const promptTemplates: PromptTemplate[] = [lintPromptTemplate];
