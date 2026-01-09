import type { DocumentRecord } from "@/platform/storage/types";

export type WorkflowStage = "drafting" | "review" | "ready";

export const resolveWorkflowStage = (doc: DocumentRecord): WorkflowStage => {
  if (doc.status === "ready") return "ready";
  const stage = doc.meta?.workflowStage;
  if (stage === "review") return "review";
  if (stage === "drafting") return "drafting";
  return doc.lastCheckedAt ? "review" : "drafting";
};
