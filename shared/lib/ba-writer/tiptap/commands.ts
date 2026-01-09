import type { EditorState, Transaction } from "@tiptap/pm/state";
import {
  findSuggestionBlocks,
  findSuggestionMarkRanges,
} from "@/shared/lib/ba-writer/tiptap/utils";

const unwrapSuggestionBlocks = (
  tr: Transaction,
  blockMatches: ReturnType<typeof findSuggestionBlocks>
) => {
  const sorted = [...blockMatches].sort((a, b) => b.pos - a.pos);
  sorted.forEach((match) => {
    tr.replaceWith(
      match.pos,
      match.pos + match.node.nodeSize,
      match.node.content
    );
  });
};

const deleteSuggestionBlocks = (
  tr: Transaction,
  blockMatches: ReturnType<typeof findSuggestionBlocks>
) => {
  const sorted = [...blockMatches].sort((a, b) => b.pos - a.pos);
  sorted.forEach((match) => {
    tr.delete(match.pos, match.pos + match.node.nodeSize);
  });
};

const removeSuggestionMarks = (
  tr: Transaction,
  markRanges: ReturnType<typeof findSuggestionMarkRanges>
) => {
  if (!markRanges.length) return;
  const markType = tr.doc.type.schema.marks.suggestion;
  if (!markType) return;
  markRanges.forEach((range) => {
    tr.removeMark(range.from, range.to, markType);
  });
};

const deleteSuggestionMarks = (
  tr: Transaction,
  markRanges: ReturnType<typeof findSuggestionMarkRanges>
) => {
  const sorted = [...markRanges].sort((a, b) => b.from - a.from);
  sorted.forEach((range) => {
    tr.delete(range.from, range.to);
  });
};

export const acceptSuggestion = (
  state: EditorState,
  suggestionId: string
): Transaction | null => {
  const blockMatches = findSuggestionBlocks(state.doc, suggestionId);
  const markRanges = findSuggestionMarkRanges(state.doc, suggestionId);

  if (blockMatches.length === 0 && markRanges.length === 0) return null;

  const tr = state.tr;
  removeSuggestionMarks(tr, markRanges);
  unwrapSuggestionBlocks(tr, blockMatches);

  return tr.steps.length > 0 ? tr : null;
};

export const rejectSuggestion = (
  state: EditorState,
  suggestionId: string
): Transaction | null => {
  const tr = state.tr;
  const blockMatches = findSuggestionBlocks(tr.doc, suggestionId);
  deleteSuggestionBlocks(tr, blockMatches);

  const markRanges = findSuggestionMarkRanges(tr.doc, suggestionId);
  deleteSuggestionMarks(tr, markRanges);

  return tr.steps.length > 0 ? tr : null;
};

export const acceptAllSuggestions = (state: EditorState): Transaction | null => {
  const blockMatches = findSuggestionBlocks(state.doc);
  const markRanges = findSuggestionMarkRanges(state.doc);

  if (blockMatches.length === 0 && markRanges.length === 0) return null;

  const tr = state.tr;
  removeSuggestionMarks(tr, markRanges);
  unwrapSuggestionBlocks(tr, blockMatches);

  return tr.steps.length > 0 ? tr : null;
};

export const rejectAllSuggestions = (state: EditorState): Transaction | null => {
  const tr = state.tr;
  const blockMatches = findSuggestionBlocks(tr.doc);
  deleteSuggestionBlocks(tr, blockMatches);

  const markRanges = findSuggestionMarkRanges(tr.doc);
  deleteSuggestionMarks(tr, markRanges);

  return tr.steps.length > 0 ? tr : null;
};
