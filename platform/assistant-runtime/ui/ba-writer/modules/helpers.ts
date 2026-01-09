import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { DocumentRecord } from "@/platform/storage/types";
import { buildDocumentPromptParts } from "@/shared/lib/document/prompt";
import { tiptapToMarkdown } from "@/shared/lib/text-prep/tiptapToMarkdown";
import type { WorkflowStage } from "@/shared/lib/document/workflow";
import type {
  BaWriterBlock,
  BaWriterOutput,
  BaWriterSectionId,
  BaWriterSuggestion,
} from "@/shared/lib/ba-writer/types";
import {
  SECTION_INDEX,
  SECTION_LABEL_BY_NORMALIZED,
  SECTION_ORDER,
  WORKFLOW_STAGE_KEY,
} from "@/platform/assistant-runtime/ui/ba-writer/modules/constants";

type TiptapContent = Record<string, unknown>;

const createTextNode = (text: string): TiptapContent => ({
  type: "text",
  text,
});

const createParagraphNode = (text: string): TiptapContent => ({
  type: "paragraph",
  content: text ? [createTextNode(text)] : [],
});

export const applyWorkflowStage = (
  doc: DocumentRecord,
  stage: WorkflowStage
): DocumentRecord => ({
  ...doc,
  meta: {
    ...(doc.meta ?? {}),
    [WORKFLOW_STAGE_KEY]: stage,
  },
});

const createHeadingNode = (text: string, level: number): TiptapContent => ({
  type: "heading",
  attrs: { level },
  content: text ? [createTextNode(text)] : [],
});

const createListNode = (
  type: "bulletList" | "orderedList",
  items: string[]
): TiptapContent => ({
  type,
  content: items.map((item) => ({
    type: "listItem",
    content: [createParagraphNode(item)],
  })),
});

const createDividerNode = (): TiptapContent => ({
  type: "horizontalRule",
});

const createTableCell = (
  type: "tableHeader" | "tableCell",
  text: string
): TiptapContent => ({
  type,
  content: [createParagraphNode(text)],
});

const createTableRow = (
  type: "tableHeader" | "tableCell",
  cells: string[]
): TiptapContent => ({
  type: "tableRow",
  content: cells.map((cell) => createTableCell(type, cell)),
});

const createTableNode = (
  columns: string[],
  rows: string[][]
): TiptapContent => ({
  type: "table",
  content: [
    createTableRow("tableHeader", columns),
    ...rows.map((row) => createTableRow("tableCell", row)),
  ],
});

const buildSuggestionAttrs = (
  suggestionId: string,
  suggestion: BaWriterSuggestion | null
) => ({
  id: suggestionId,
  origin: "ai" as const,
  kind: suggestion?.kind ?? "formatting",
  reason: suggestion?.reason ?? "Suggested update",
  confidence: suggestion?.confidence ?? null,
});

const wrapSuggestionBlock = (
  content: TiptapContent,
  suggestionId: string,
  suggestion: BaWriterSuggestion | null
): TiptapContent => ({
  type: "suggestionBlock",
  attrs: buildSuggestionAttrs(suggestionId, suggestion),
  content: [content],
});

export const blockToTiptapNode = (
  block: BaWriterBlock,
  suggestionMap: Map<string, BaWriterSuggestion>
): TiptapContent | null => {
  let node: TiptapContent | null = null;

  switch (block.type) {
    case "heading":
      node = createHeadingNode(block.text, block.level);
      break;
    case "paragraph":
      node = createParagraphNode(block.text);
      break;
    case "bulletList":
      node = createListNode("bulletList", block.items);
      break;
    case "orderedList":
      node = createListNode("orderedList", block.items);
      break;
    case "divider":
      node = createDividerNode();
      break;
    case "table":
      node = createTableNode(block.columns, block.rows);
      break;
    default:
      return null;
  }

  if (block.origin !== "ai") return node;
  if (!block.suggestionId) return node;

  const suggestion = suggestionMap.get(block.suggestionId) ?? null;
  return wrapSuggestionBlock(node, block.suggestionId, suggestion);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeContentForPrompt = (
  node: Record<string, unknown>
): Record<string, unknown> => {
  const content = Array.isArray(node.content) ? node.content : null;
  if (!content) return node;

  const nextContent: Record<string, unknown>[] = [];
  content.forEach((child) => {
    if (!isRecord(child)) return;
    const normalizedChild = normalizeContentForPrompt(child);
    const type =
      typeof normalizedChild.type === "string" ? normalizedChild.type : "";
    if (type === "suggestionBlock") {
      const inner = Array.isArray(normalizedChild.content)
        ? normalizedChild.content.filter(isRecord)
        : [];
      inner.forEach((innerNode) => nextContent.push(innerNode));
    } else {
      nextContent.push(normalizedChild);
    }
  });

  return {
    ...node,
    content: nextContent,
  };
};

const resolveSourceText = (
  content: Record<string, unknown>,
  fallbackText: string
) => {
  const normalized = normalizeContentForPrompt(content);
  const markdown = tiptapToMarkdown(normalized);
  if (markdown.trim()) return markdown;
  return fallbackText.trim() ? fallbackText : "";
};

export const buildNotesFromDoc = (
  doc: DocumentRecord,
  content: Record<string, unknown>,
  fallbackText: string
) => {
  const sourceText = resolveSourceText(content, fallbackText);
  const promptParts = buildDocumentPromptParts({
    title: doc.title,
    content: sourceText,
  });
  return promptParts.userPrompt;
};

const resolveSectionId = (text: string) =>
  SECTION_LABEL_BY_NORMALIZED.get(text.trim().toLowerCase()) ?? null;

const getHeadingSectionId = (node: ProseMirrorNode) => {
  if (node.type.name === "heading") {
    return resolveSectionId(node.textContent);
  }

  if (node.type.name !== "suggestionBlock") return null;

  let found: BaWriterSectionId | null = null;
  node.descendants((child) => {
    if (child.type.name !== "heading") return true;
    found = resolveSectionId(child.textContent);
    return false;
  });

  return found;
};

const collectSectionHeadings = (doc: ProseMirrorNode) => {
  const matches: Array<{
    sectionId: BaWriterSectionId;
    pos: number;
    nodeSize: number;
  }> = [];
  let pos = 0;

  doc.content.forEach((node) => {
    const sectionId = getHeadingSectionId(node);
    if (sectionId) {
      matches.push({ sectionId, pos, nodeSize: node.nodeSize });
    }
    pos += node.nodeSize;
  });

  return matches;
};

const hasSectionHeading = (
  doc: ProseMirrorNode,
  sectionId: BaWriterSectionId
) => collectSectionHeadings(doc).some((match) => match.sectionId === sectionId);

export const getSectionInsertPosition = (
  doc: ProseMirrorNode,
  sectionId: BaWriterSectionId
) => {
  const headings = collectSectionHeadings(doc);
  const existingIndex = headings.findIndex(
    (match) => match.sectionId === sectionId
  );

  if (existingIndex >= 0) {
    const next = headings[existingIndex + 1];
    return next ? next.pos : doc.content.size;
  }

  const targetIndex = SECTION_INDEX[sectionId];
  const nextByOrder = headings.find(
    (match) => SECTION_INDEX[match.sectionId] > targetIndex
  );

  return nextByOrder ? nextByOrder.pos : doc.content.size;
};

const groupBlocksBySection = (blocks: BaWriterBlock[]) => {
  const grouped = new Map<BaWriterSectionId, BaWriterBlock[]>();
  blocks.forEach((block) => {
    const list = grouped.get(block.sectionId) ?? [];
    list.push(block);
    grouped.set(block.sectionId, list);
  });
  return grouped;
};

export const applyWriterOutput = (
  editor: TiptapEditor | null,
  output: BaWriterOutput
) => {
  if (!editor) return;

  const suggestionMap = new Map(
    output.suggestions.map((suggestion) => [suggestion.id, suggestion])
  );
  const blocksBySection = groupBlocksBySection(output.blocks);

  SECTION_ORDER.forEach((sectionId) => {
    const blocks = blocksBySection.get(sectionId) ?? [];
    if (blocks.length === 0) return;

    const headingExists = hasSectionHeading(editor.state.doc, sectionId);
    const nodes = blocks
      .filter((block) => !(block.type === "heading" && headingExists))
      .map((block) => blockToTiptapNode(block, suggestionMap))
      .filter((node): node is TiptapContent => node !== null);

    if (nodes.length === 0) return;

    const insertPos = getSectionInsertPosition(editor.state.doc, sectionId);
    editor.commands.insertContentAt(insertPos, nodes);
  });
};

export type { TiptapContent };
