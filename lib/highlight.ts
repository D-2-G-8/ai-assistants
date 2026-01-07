import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Issue } from "@/lib/schemas";

export type HighlightRange = {
  issueId: string;
  from: number;
  to: number;
  severity: Issue["severity"];
  message: string;
  fixSuggestion: string;
};

type HighlightState = {
  ranges: HighlightRange[];
  decorations: DecorationSet;
};

type HighlightMeta = {
  type: "set";
  ranges: HighlightRange[];
};

export const highlightPluginKey = new PluginKey<HighlightState>("ai-highlight");

const MAX_TOOLTIP = 280;

const rangesIntersect = (
  aFrom: number,
  aTo: number,
  bFrom: number,
  bTo: number
) => {
  if (bFrom === bTo) {
    return bFrom >= aFrom && bFrom <= aTo;
  }
  return Math.max(aFrom, bFrom) < Math.min(aTo, bTo);
};

const clampRange = (doc: Node, range: HighlightRange) => {
  const maxPos = doc.content.size;
  const from = Math.max(0, Math.min(range.from, maxPos));
  const to = Math.max(from + 1, Math.min(range.to, maxPos));
  return { ...range, from, to };
};

const buildTooltip = (range: HighlightRange) => {
  const combined = `${range.message}${
    range.fixSuggestion ? `\nFix: ${range.fixSuggestion}` : ""
  }`;
  return combined.length > MAX_TOOLTIP
    ? `${combined.slice(0, MAX_TOOLTIP)}...`
    : combined;
};

const createDecorations = (doc: Node, ranges: HighlightRange[]) => {
  const decorations = ranges.map((range) => {
    const safeRange = clampRange(doc, range);
    if (safeRange.from >= safeRange.to) {
      return null;
    }

    const tooltip = buildTooltip(safeRange);

    return Decoration.inline(safeRange.from, safeRange.to, {
      class: `issue-highlight issue-${safeRange.severity}`,
      "data-issue-id": safeRange.issueId,
      "data-tooltip": tooltip,
      title: tooltip,
    });
  });

  return DecorationSet.create(
    doc,
    decorations.filter(Boolean) as Decoration[]
  );
};

type TextIndexMap = {
  text: string;
  indexMap: number[];
};

const buildTextIndexMap = (doc: Node): TextIndexMap => {
  const chars: string[] = [];
  const indexMap: number[] = [];

  const appendText = (text: string, pos: number) => {
    for (let i = 0; i < text.length; i += 1) {
      chars.push(text[i]);
      indexMap.push(pos + i);
    }
  };

  const walk = (node: Node, pos: number) => {
    if (node.isText) {
      appendText(node.text || "", pos);
      return;
    }

    if (node.isLeaf) {
      return;
    }

    const beforeLength = chars.length;
    node.forEach((child, offset) => {
      walk(child, pos + offset + 1);
    });

    if (node.isBlock && chars.length > beforeLength) {
      chars.push("\n");
      indexMap.push(pos + node.nodeSize - 1);
    }
  };

  walk(doc, 0);

  while (chars.length > 0 && chars[chars.length - 1] === "\n") {
    chars.pop();
    indexMap.pop();
  }

  return { text: chars.join(""), indexMap };
};

export const buildHighlightRanges = (doc: Node, issues: Issue[]) => {
  const { text, indexMap } = buildTextIndexMap(doc);
  const ranges: HighlightRange[] = [];
  const unmatched: string[] = [];

  issues.forEach((issue) => {
    const candidates = [issue.quote, issue.startHint]
      .filter((candidate): candidate is string => Boolean(candidate))
      .map((candidate) => candidate.trim())
      .filter(Boolean);

    if (candidates.length === 0) {
      unmatched.push(issue.id);
      return;
    }

    let matchedText = "";
    let startIndex = -1;
    for (const candidate of candidates) {
      const index = text.indexOf(candidate);
      if (index !== -1) {
        matchedText = candidate;
        startIndex = index;
        break;
      }
    }

    if (startIndex === -1 || !matchedText) {
      unmatched.push(issue.id);
      return;
    }

    const endIndex = startIndex + matchedText.length;
    const from = indexMap[startIndex];
    const to = indexMap[endIndex - 1];

    if (from === undefined || to === undefined) {
      unmatched.push(issue.id);
      return;
    }

    ranges.push({
      issueId: issue.id,
      from,
      to: to + 1,
      severity: issue.severity,
      message: issue.message,
      fixSuggestion: issue.fix_suggestion,
    });
  });

  return { ranges, unmatched };
};

const highlightPlugin = new Plugin<HighlightState>({
  key: highlightPluginKey,
  state: {
    init: () => ({ ranges: [], decorations: DecorationSet.empty }),
    apply(tr, prev) {
      const meta = tr.getMeta(highlightPluginKey) as HighlightMeta | undefined;
      if (meta?.type === "set") {
        return {
          ranges: meta.ranges,
          decorations: createDecorations(tr.doc, meta.ranges),
        };
      }

      if (!tr.docChanged || prev.ranges.length === 0) {
        return prev;
      }

      const removedIds = new Set<string>();
      tr.mapping.maps.forEach((map) => {
        map.forEach((from, to) => {
          prev.ranges.forEach((range) => {
            if (rangesIntersect(range.from, range.to, from, to)) {
              removedIds.add(range.issueId);
            }
          });
        });
      });

      const mappedRanges = prev.ranges
        .filter((range) => !removedIds.has(range.issueId))
        .map((range) => ({
          ...range,
          from: tr.mapping.map(range.from, 1),
          to: tr.mapping.map(range.to, -1),
        }))
        .filter((range) => range.from < range.to);

      return {
        ranges: mappedRanges,
        decorations: createDecorations(tr.doc, mappedRanges),
      };
    },
  },
  props: {
    decorations(state) {
      return highlightPluginKey.getState(state)?.decorations || null;
    },
  },
});

export const AiHighlight = Extension.create({
  name: "aiHighlight",
  addCommands() {
    return {
      setHighlights:
        (ranges: HighlightRange[]) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(highlightPluginKey, { type: "set", ranges }));
          return true;
        },
      clearHighlights:
        () =>
        ({ tr, dispatch }) => {
          dispatch?.(
            tr.setMeta(highlightPluginKey, { type: "set", ranges: [] })
          );
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [highlightPlugin];
  },
});
