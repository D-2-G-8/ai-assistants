export type FindingSeverity = "info" | "warn" | "error";
export type FindingKind = "issue" | "question" | "recommendation";
export type FindingSource = "ai" | "user";

export type FindingAnchor = {
  quote?: string | null;
  startHint?: string | null;
  endHint?: string | null;
  path?: string | null;
};

export type Finding = {
  id: string;
  severity: FindingSeverity;
  kind: FindingKind;
  message: string;
  suggestion?: string | null;
  category?: string | null;
  anchor?: FindingAnchor;
  source?: FindingSource;
};

export type JsonPatchOperation = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  from?: string;
  value?: unknown;
};

export type ArtifactApplyPolicy = "manual" | "auto";
export type ArtifactPatchType = "jsonPatch" | "diff" | "blocks";

export type Block = {
  type: "paragraph" | "heading";
  text: string;
  level?: number;
};

export type DocPatchArtifact = {
  id: string;
  type: "doc_patch";
  patchType: "jsonPatch";
  apply: ArtifactApplyPolicy;
  requiresHumanReview: boolean;
  patch: JsonPatchOperation[];
};

export type BlocksArtifact = {
  id: string;
  type: "blocks";
  patchType: "blocks";
  apply: ArtifactApplyPolicy;
  requiresHumanReview: boolean;
  blocks: Block[];
};

export type Artifact = DocPatchArtifact | BlocksArtifact;

export type AssistantResult = {
  findings: Finding[];
  artifacts: Artifact[];
};
