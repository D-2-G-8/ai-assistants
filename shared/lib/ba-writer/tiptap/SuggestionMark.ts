import { Mark, mergeAttributes } from "@tiptap/core";

type SuggestionAttributes = {
  id: string | null;
  origin: "ai";
  kind:
    | "formatting"
    | "placeholder"
    | "question"
    | "assumption"
    | "best_practice"
    | null;
  reason: string | null;
  confidence: number | null;
};

const parseConfidence = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const SuggestionMark = Mark.create({
  name: "suggestion",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes) =>
          attributes.id
            ? { "data-suggestion-id": attributes.id }
            : {},
      },
      origin: {
        default: "ai",
        parseHTML: (element) =>
          (element.getAttribute("data-suggestion-origin") as
            | SuggestionAttributes["origin"]
            | null) ?? "ai",
        renderHTML: (attributes) => ({
          "data-suggestion-origin": attributes.origin,
        }),
      },
      kind: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-suggestion-kind"),
        renderHTML: (attributes) =>
          attributes.kind
            ? { "data-suggestion-kind": attributes.kind }
            : {},
      },
      reason: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-suggestion-reason"),
        renderHTML: (attributes) =>
          attributes.reason
            ? { "data-suggestion-reason": attributes.reason }
            : {},
      },
      confidence: {
        default: null,
        parseHTML: (element) =>
          parseConfidence(
            element.getAttribute("data-suggestion-confidence")
          ),
        renderHTML: (attributes) =>
          typeof attributes.confidence === "number"
            ? {
                "data-suggestion-confidence": attributes.confidence,
              }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-suggestion-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ class: "ba-suggestion" }, HTMLAttributes),
      0,
    ];
  },
});

export default SuggestionMark;
