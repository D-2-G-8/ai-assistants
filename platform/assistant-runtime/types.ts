import type { z } from "zod";
import type { DocType, AssistantAction } from "@/platform/storage/types";
import type { AssistantResult } from "@/platform/artifacts/types";

export type AssistantUiFieldOption = {
  label: string;
  value: string;
};

export type AssistantUiField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: AssistantUiFieldOption[];
  defaultValue?: string;
};

export type AssistantUiSchema = {
  title?: string;
  description?: string;
  fields: AssistantUiField[];
};

export type PromptTemplateResult = {
  systemPrompt: string;
  userPrompt: string;
  prepResult?: unknown;
  outline?: string[];
};

export type DocumentSnapshot = {
  title: string;
  docType: DocType;
  content: Record<string, unknown>;
  contentText?: string;
  meta?: Record<string, unknown>;
  versionId: string;
};

export type PromptBuildInput = {
  document: DocumentSnapshot;
  inputs?: Record<string, unknown>;
};

export type PromptTemplate = {
  id: string;
  version: string;
  build: (input: PromptBuildInput) => PromptTemplateResult;
};

export type AssistantProfile = {
  id: string;
  name: string;
  docTypes: DocType[];
  actions: AssistantAction[];
  promptTemplateId: string;
  promptTemplateVersion: string;
  llm: {
    provider: "openrouter";
    model: string;
    temperature?: number;
  };
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  normalizeOutput?: (output: unknown) => AssistantResult;
  uiSchema: AssistantUiSchema;
  versionId: string;
};

export type AssistantRunRequest = {
  documentId: string;
  action: AssistantAction;
  assistantProfileId?: string;
  inputs?: Record<string, unknown>;
  document: DocumentSnapshot;
  dryRun?: boolean;
};

export type AssistantRunResponse = {
  run: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed";
    result?: AssistantResult;
  };
  promptSnapshot?: { system: string; user: string };
};
