import type { AssistantResult, Artifact, Finding } from "@/platform/artifacts/types";

const normalizeFinding = (finding: Finding): Finding => ({
  ...finding,
  source: finding.source ?? "ai",
});

const normalizeArtifact = (artifact: Artifact): Artifact => {
  if (artifact.type === "doc_patch") {
    return {
      ...artifact,
      apply: artifact.apply ?? "manual",
      requiresHumanReview: artifact.requiresHumanReview ?? true,
      patchType: "jsonPatch",
    };
  }

  return {
    ...artifact,
    apply: artifact.apply ?? "manual",
    requiresHumanReview: artifact.requiresHumanReview ?? true,
    patchType: "blocks",
  };
};

export const normalizeAssistantResult = (
  result: AssistantResult
): AssistantResult => ({
  findings: result.findings.map(normalizeFinding),
  artifacts: result.artifacts.map(normalizeArtifact),
});
