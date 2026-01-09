import type { BaWriterSectionId } from "@/shared/lib/ba-writer/types";

export const SECTION_ORDER: BaWriterSectionId[] = [
  "doc.passport",
  "context",
  "roles",
  "scope",
  "process",
  "requirements",
  "data",
  "exceptions",
  "acceptance",
  "tracking",
  "changelog",
];

export const SECTION_LABELS: Record<BaWriterSectionId, string> = {
  "doc.passport": "Паспорт документа",
  context: "Контекст и цель",
  roles: "Стейкхолдеры и роли",
  scope: "Область работ",
  process: "Процессы и сценарии",
  requirements: "Требования",
  data: "Данные на бизнес-уровне",
  exceptions: "Обработка проблемных ситуаций",
  acceptance: "Приемка",
  tracking: "Открытые вопросы и риски",
  changelog: "История изменений",
};

export const SECTION_INDEX = SECTION_ORDER.reduce<Record<BaWriterSectionId, number>>(
  (acc, sectionId, index) => {
    acc[sectionId] = index;
    return acc;
  },
  {} as Record<BaWriterSectionId, number>
);

export const SECTION_LABEL_BY_NORMALIZED = new Map<string, BaWriterSectionId>(
  Object.entries(SECTION_LABELS).map(([sectionId, label]) => [
    label.trim().toLowerCase(),
    sectionId as BaWriterSectionId,
  ])
);

export const WORKFLOW_STAGE_KEY = "workflowStage";
export const BA_WRITER_PROFILE_ID = "ba-writer";
export const BA_WRITER_PROFILE_VERSION_ID = "ba-writer@local";
export const DEFAULT_DOC_TITLE = "New Product Doc";
