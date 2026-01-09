import type { Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { BaWriterSuggestion } from "@/shared/lib/ba-writer/types";

type SuggestionKind = BaWriterSuggestion["kind"];

type SuggestionAttributes = {
  id: string;
  origin: "ai";
  kind: SuggestionKind;
  reason: string;
  confidence: number | null;
};

export type SuggestionEntry = SuggestionAttributes & {
  source: "block" | "mark";
};

export type SuggestionBlockMatch = {
  pos: number;
  node: ProseMirrorNode;
  attrs: SuggestionAttributes;
};

export type SuggestionMarkRange = {
  from: number;
  to: number;
  attrs: SuggestionAttributes;
};

const suggestionKindList = [
  "formatting",
  "placeholder",
  "question",
  "assumption",
  "best_practice",
] as const satisfies readonly SuggestionKind[];

const isSuggestionKind = (value: unknown): value is SuggestionKind =>
  typeof value === "string" &&
  suggestionKindList.includes(value as SuggestionKind);

const normalizeAttributes = (
  attrs: Record<string, unknown>
): SuggestionAttributes | null => {
  const id = typeof attrs.id === "string" ? attrs.id : null;
  const origin = attrs.origin === "ai" ? "ai" : null;
  const kind = isSuggestionKind(attrs.kind) ? attrs.kind : null;
  const reason = typeof attrs.reason === "string" ? attrs.reason : "";
  const confidence =
    typeof attrs.confidence === "number" && !Number.isNaN(attrs.confidence)
      ? attrs.confidence
      : null;

  if (!id || !origin || !kind) return null;

  return {
    id,
    origin,
    kind,
    reason,
    confidence,
  };
};

const readMarkAttributes = (mark: Mark): SuggestionAttributes | null =>
  normalizeAttributes(mark.attrs as Record<string, unknown>);

const readNodeAttributes = (node: ProseMirrorNode): SuggestionAttributes | null =>
  normalizeAttributes(node.attrs as Record<string, unknown>);

export const findSuggestionBlocks = (
  doc: ProseMirrorNode,
  suggestionId?: string
): SuggestionBlockMatch[] => {
  const matches: SuggestionBlockMatch[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== "suggestionBlock") return;
    const attrs = readNodeAttributes(node);
    if (!attrs) return;
    if (suggestionId && attrs.id !== suggestionId) return;
    matches.push({ pos, node, attrs });
  });

  return matches;
};

export const findSuggestionMarkRanges = (
  doc: ProseMirrorNode,
  suggestionId?: string
): SuggestionMarkRange[] => {
  const ranges: SuggestionMarkRange[] = [];

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (!node.isText) return;
    if (!node.marks.length) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== "suggestion") return;
      const attrs = readMarkAttributes(mark);
      if (!attrs) return;
      if (suggestionId && attrs.id !== suggestionId) return;
      ranges.push({
        from: pos,
        to: pos + node.nodeSize,
        attrs,
      });
    });
  });

  return ranges;
};

export const listSuggestions = (doc: ProseMirrorNode): SuggestionEntry[] => {
  const entries = new Map<string, SuggestionEntry>();

  const upsert = (entry: SuggestionEntry) => {
    const existing = entries.get(entry.id);
    if (!existing) {
      entries.set(entry.id, entry);
      return;
    }
    if (existing.source === "mark" && entry.source === "block") {
      entries.set(entry.id, entry);
    }
  };

  doc.descendants((node) => {
    if (node.type.name !== "suggestionBlock") return;
    const attrs = readNodeAttributes(node);
    if (!attrs) return;
    upsert({ ...attrs, source: "block" });
  });

  doc.nodesBetween(0, doc.content.size, (node) => {
    if (!node.isText || node.marks.length === 0) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== "suggestion") return;
      const attrs = readMarkAttributes(mark);
      if (!attrs) return;
      upsert({ ...attrs, source: "mark" });
    });
  });

  return Array.from(entries.values());
};
