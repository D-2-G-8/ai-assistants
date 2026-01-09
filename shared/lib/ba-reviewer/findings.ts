import type { Finding } from "@/platform/artifacts/types";
import type { DocumentRecord } from "@/platform/storage/types";

export type FindingCounts = {
  blockerCount: number;
  warningCount: number;
  suggestionCount: number;
};

export const filterEffectiveFindings = (
  doc: DocumentRecord | null,
  findings: Finding[]
): Finding[] => {
  if (!doc) return findings;
  const ignored = new Set(doc.ignoredFindingIds || []);
  return findings.filter((finding) => !ignored.has(finding.id));
};

export const countFindingsBySeverity = (
  findings: Finding[]
): FindingCounts => {
  const counts: FindingCounts = {
    blockerCount: 0,
    warningCount: 0,
    suggestionCount: 0,
  };

  findings.forEach((finding) => {
    if (finding.severity === "error") counts.blockerCount += 1;
    if (finding.severity === "warn") counts.warningCount += 1;
    if (finding.severity === "info") counts.suggestionCount += 1;
  });

  return counts;
};
