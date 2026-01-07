import type { AssistantResult } from "@/platform/artifacts/types";

export type DocType =
  | "business"
  | "technical"
  | "testcase"
  | "autotest"
  | "code";

export type DocStatus = "draft" | "ready";

export type QaEntry = {
  id: string;
  question: string;
  answer: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  docType: DocType;
  content: Record<string, unknown>;
  meta: Record<string, unknown>;
  versionId: string;
  status: DocStatus;
  updatedAt: string;
  createdAt?: string;
  lastCheckedAt?: string;
  lastCheckedBy?: string;
  qa?: QaEntry[];
  ignoredFindingIds?: string[];
  ignoredIssueIds?: string[];
};

export type AssistantAction =
  | "lint"
  | "draft"
  | "extract"
  | "generate"
  | "refactor"
  | "explain";

export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type RunMetrics = {
  tokens?: number;
  durationMs?: number;
  costUsd?: number;
};

export type RunRecord = {
  id: string;
  documentId: string;
  inputDocumentVersionId: string;
  assistantProfileId: string;
  assistantProfileVersionId: string;
  action: AssistantAction;
  status: RunStatus;
  promptSnapshot?: {
    system: string;
    user: string;
  };
  rawResponse?: string;
  result?: AssistantResult;
  metrics?: RunMetrics;
  error?: string;
  createdAt: string;
  updatedAt: string;
};
