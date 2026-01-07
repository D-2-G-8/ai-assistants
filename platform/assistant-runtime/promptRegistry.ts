import type { PromptTemplate } from "@/platform/assistant-runtime/types";
import { promptTemplates } from "@/platform/assistant-runtime/promptTemplates";

const templateById = new Map<string, PromptTemplate>(
  promptTemplates.map((template) => [template.id, template])
);

export const getPromptTemplate = (id: string) => templateById.get(id) || null;
