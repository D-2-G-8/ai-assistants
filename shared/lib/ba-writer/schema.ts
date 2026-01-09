import { z } from "zod";

export const baWriterStatusSchema = z.enum(["Draft", "Review", "Approved"]);
export const baWriterSectionIdSchema = z.enum([
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
]);
export const baWriterTableTypeSchema = z.enum([
  "roles",
  "scenarios",
  "process_steps",
  "requirements_matrix",
  "business_rules",
  "quality_expectations",
  "business_entities",
  "dictionaries",
  "exception_handling",
  "acceptance_criteria",
  "open_questions",
  "risks",
]);

const originSchema = z.enum(["user", "ai"]);
const suggestionIdSchema = z.string().min(1).nullable();
const sectionIdSchema = baWriterSectionIdSchema;
const tableTypeSchema = baWriterTableTypeSchema;

type SectionId = z.infer<typeof baWriterSectionIdSchema>;
type TableType = z.infer<typeof baWriterTableTypeSchema>;

const SECTION_ORDER = [
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
] as const satisfies readonly SectionId[];

const SECTION_INDEX = SECTION_ORDER.reduce(
  (acc, sectionId, index) => {
    acc[sectionId] = index;
    return acc;
  },
  {} as Record<SectionId, number>
);

const TABLE_SECTION_BY_TYPE: Record<TableType, SectionId> = {
  roles: "roles",
  scenarios: "process",
  process_steps: "process",
  requirements_matrix: "requirements",
  business_rules: "requirements",
  quality_expectations: "requirements",
  business_entities: "data",
  dictionaries: "data",
  exception_handling: "exceptions",
  acceptance_criteria: "acceptance",
  open_questions: "tracking",
  risks: "tracking",
};

const TABLE_COLUMNS_BY_TYPE: Record<TableType, readonly string[]> = {
  roles: [
    "Роль",
    "Описание",
    "Цели/мотивация",
    "Ограничения/особенности",
  ],
  scenarios: ["ID", "Роль", "Цель", "Триггер", "Результат"],
  process_steps: [
    "№",
    "Шаг",
    "Исполнитель (роль)",
    "Вход",
    "Выход",
    "Комментарий/условия",
  ],
  requirements_matrix: [
    "Бизнес-цель/потребность",
    "Требование",
    "Ожидаемый результат",
    "Приоритет",
    "Критерии приемки",
    "Статус",
  ],
  business_rules: [
    "Правило",
    "Когда применяется",
    "Исключения",
    "Примечания/риски",
  ],
  quality_expectations: ["Категория", "Ожидание", "Как проверяем"],
  business_entities: [
    "Сущность",
    "Описание",
    "Ключевые атрибуты",
    "Связи/заметки",
  ],
  dictionaries: [
    "Справочник",
    "Описание",
    "Владелец",
    "Правила обновления/примечания",
  ],
  exception_handling: [
    "Ситуация",
    "Как распознаём (бизнес-условие)",
    "Что показываем пользователю",
    "Что пользователь может сделать",
    "Что происходит с данными",
  ],
  acceptance_criteria: [
    "Ссылка (требование/сценарий)",
    "Критерий",
    "Пример/данные",
  ],
  open_questions: ["Вопрос", "Варианты", "Ответственный", "Дедлайн", "Статус"],
  risks: ["Риск", "Влияние", "Вероятность", "Митигация"],
};

const REQUIRED_TABLES_BY_SECTION: Record<SectionId, TableType[]> = {
  "doc.passport": [],
  context: [],
  roles: ["roles"],
  scope: [],
  process: ["scenarios", "process_steps"],
  requirements: [
    "requirements_matrix",
    "business_rules",
    "quality_expectations",
  ],
  data: ["business_entities", "dictionaries"],
  exceptions: ["exception_handling"],
  acceptance: ["acceptance_criteria"],
  tracking: ["open_questions", "risks"],
  changelog: [],
};

const arrayEquals = (left: readonly string[], right: readonly string[]) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

export const baWriterDocSchema = z
  .object({
    title: z.string().min(1),
    version: z.string().min(1).nullable(),
    status: baWriterStatusSchema.nullable(),
  })
  .strict();

export const baWriterSuggestionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum([
      "formatting",
      "placeholder",
      "question",
      "assumption",
      "best_practice",
    ]),
    reason: z.string().min(1),
    confidence: z.number().nullable(),
  })
  .strict();

export const baWriterMissingInfoSchema = z
  .object({
    sectionId: sectionIdSchema,
    priority: z.enum(["high", "medium", "low"]),
    question: z.string().min(1),
  })
  .strict();

const headingBlockSchema = z
  .object({
    type: z.literal("heading"),
    sectionId: sectionIdSchema,
    level: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    text: z.string(),
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict();

const paragraphBlockSchema = z
  .object({
    type: z.literal("paragraph"),
    sectionId: sectionIdSchema,
    text: z.string(),
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict();

const bulletListBlockSchema = z
  .object({
    type: z.literal("bulletList"),
    sectionId: sectionIdSchema,
    items: z.array(z.string()),
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict();

const orderedListBlockSchema = z
  .object({
    type: z.literal("orderedList"),
    sectionId: sectionIdSchema,
    items: z.array(z.string()),
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict();

const dividerBlockSchema = z
  .object({
    type: z.literal("divider"),
    sectionId: sectionIdSchema,
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict();

const tableBlockSchema = z
  .object({
    type: z.literal("table"),
    sectionId: sectionIdSchema,
    tableType: tableTypeSchema,
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    origin: originSchema,
    suggestionId: suggestionIdSchema,
  })
  .strict()
  .superRefine((block, ctx) => {
    const expectedSection = TABLE_SECTION_BY_TYPE[block.tableType];
    if (block.sectionId !== expectedSection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `tableType must be in sectionId ${expectedSection}`,
        path: ["sectionId"],
      });
    }

    const expectedColumns = TABLE_COLUMNS_BY_TYPE[block.tableType];
    if (!arrayEquals(block.columns, expectedColumns)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `columns must match tableType ${block.tableType}`,
        path: ["columns"],
      });
    }

    block.rows.forEach((row, rowIndex) => {
      if (row.length !== block.columns.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "row length must match columns length",
          path: ["rows", rowIndex],
        });
      }
    });
  });

export const baWriterBlockSchema = z
  .discriminatedUnion("type", [
    headingBlockSchema,
    paragraphBlockSchema,
    bulletListBlockSchema,
    orderedListBlockSchema,
    dividerBlockSchema,
    tableBlockSchema,
  ])
  .superRefine((block, ctx) => {
    if (block.origin === "ai") {
      if (!block.suggestionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ai blocks must include a suggestionId",
          path: ["suggestionId"],
        });
      }
      return;
    }

    if (block.suggestionId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "user blocks must have suggestionId null",
        path: ["suggestionId"],
      });
    }
  });

export const baWriterSchema = z
  .object({
    doc: baWriterDocSchema,
    blocks: z.array(baWriterBlockSchema),
    suggestions: z.array(baWriterSuggestionSchema),
    missingInfo: z.array(baWriterMissingInfoSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const suggestionIds = new Set<string>();
    data.suggestions.forEach((suggestion, index) => {
      if (suggestionIds.has(suggestion.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicate suggestion id",
          path: ["suggestions", index, "id"],
        });
        return;
      }
      suggestionIds.add(suggestion.id);
    });

    const seenSections = new Set<SectionId>();
    let lastSectionIndex = -1;
    const tablesBySection = new Map<SectionId, Set<TableType>>();

    data.blocks.forEach((block, index) => {
      const sectionIndex = SECTION_INDEX[block.sectionId];
      if (sectionIndex < lastSectionIndex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "blocks must follow section order",
          path: ["blocks", index, "sectionId"],
        });
      }
      lastSectionIndex = Math.max(lastSectionIndex, sectionIndex);
      seenSections.add(block.sectionId);

      if (block.origin === "ai") {
        if (!block.suggestionId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ai blocks must include a suggestionId",
            path: ["blocks", index, "suggestionId"],
          });
        } else if (!suggestionIds.has(block.suggestionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "missing suggestion entry for suggestionId",
            path: ["blocks", index, "suggestionId"],
          });
        }
      } else if (block.suggestionId !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "user blocks must have suggestionId null",
          path: ["blocks", index, "suggestionId"],
        });
      }

      if (block.type === "table") {
        const sectionTables = tablesBySection.get(block.sectionId);
        if (sectionTables) {
          sectionTables.add(block.tableType);
        } else {
          tablesBySection.set(block.sectionId, new Set([block.tableType]));
        }
      }
    });

    SECTION_ORDER.forEach((sectionId) => {
      if (!seenSections.has(sectionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `missing section ${sectionId}`,
          path: ["blocks"],
        });
      }

      const requiredTables = REQUIRED_TABLES_BY_SECTION[sectionId];
      if (requiredTables.length === 0) return;

      const presentTables = tablesBySection.get(sectionId) ?? new Set();
      requiredTables.forEach((tableType) => {
        if (!presentTables.has(tableType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `missing table ${tableType} for section ${sectionId}`,
            path: ["blocks"],
          });
        }
      });
    });
  });
