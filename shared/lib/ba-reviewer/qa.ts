import type { Finding } from "@/platform/artifacts/types";
import type { DocumentRecord, QaEntry } from "@/platform/storage/types";

export const buildDraftAnswers = (
  doc: DocumentRecord
): Record<string, string> =>
  (doc.qa || []).reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.answer;
    return acc;
  }, {});

export const mergeDraftAnswersFromFindings = (
  prev: Record<string, string>,
  findings: Finding[],
  doc: DocumentRecord
): Record<string, string> => {
  const questions = findings.filter((item) => item.kind === "question");
  if (questions.length === 0) return prev;
  let changed = false;
  const next = { ...prev };
  questions.forEach((question) => {
    if (next[question.id] !== undefined) return;
    const existing = doc.qa?.find((entry) => entry.id === question.id);
    if (existing) {
      next[question.id] = existing.answer;
      changed = true;
    }
  });
  return changed ? next : prev;
};

export const upsertQaEntry = (
  qa: QaEntry[] | undefined,
  question: Finding,
  answer: string
): QaEntry[] => [
  ...(qa || []).filter((entry) => entry.id !== question.id),
  { id: question.id, question: question.message, answer },
];
