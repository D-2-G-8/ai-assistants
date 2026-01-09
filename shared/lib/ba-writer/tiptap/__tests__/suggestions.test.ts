import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorState } from "@tiptap/pm/state";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import SuggestionBlockNode from "@/shared/lib/ba-writer/tiptap/SuggestionBlockNode";
import SuggestionMark from "@/shared/lib/ba-writer/tiptap/SuggestionMark";
import {
  acceptSuggestion,
  rejectSuggestion,
} from "@/shared/lib/ba-writer/tiptap/commands";
import { listSuggestions } from "@/shared/lib/ba-writer/tiptap/utils";

type DocJson = {
  type: "doc";
  content: Array<Record<string, unknown>>;
};

const schema = getSchema([
  Document,
  Paragraph,
  Text,
  SuggestionBlockNode,
  SuggestionMark,
]);

const createState = (json: DocJson) =>
  EditorState.create({
    schema,
    doc: ProseMirrorNode.fromJSON(schema, json),
  });

const suggestionAttrs = {
  id: "s-1",
  origin: "ai",
  kind: "placeholder",
  reason: "Needs details",
  confidence: null,
};

describe("ba-writer suggestion commands", () => {
  it("accepts a suggestion block and keeps its content", () => {
    const state = createState({
      type: "doc",
      content: [
        {
          type: "suggestionBlock",
          attrs: suggestionAttrs,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello" }],
            },
          ],
        },
      ],
    });

    const tr = acceptSuggestion(state, "s-1");
    expect(tr).not.toBeNull();
    const next = tr ? state.apply(tr) : state;

    expect(next.doc.toJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    });
  });

  it("rejects a suggestion block and removes its content", () => {
    const state = createState({
      type: "doc",
      content: [
        {
          type: "suggestionBlock",
          attrs: suggestionAttrs,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Remove me" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep me" }],
        },
      ],
    });

    const tr = rejectSuggestion(state, "s-1");
    expect(tr).not.toBeNull();
    const next = tr ? state.apply(tr) : state;

    expect(next.doc.toJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep me" }],
        },
      ],
    });
  });

  it("lists suggestion ids from blocks and marks", () => {
    const state = createState({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Inline",
              marks: [
                {
                  type: "suggestion",
                  attrs: {
                    id: "mark-1",
                    origin: "ai",
                    kind: "question",
                    reason: "Clarify",
                    confidence: null,
                  },
                },
              ],
            },
          ],
        },
        {
          type: "suggestionBlock",
          attrs: {
            id: "block-1",
            origin: "ai",
            kind: "formatting",
            reason: "Structure",
            confidence: null,
          },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Block" }],
            },
          ],
        },
      ],
    });

    const suggestions = listSuggestions(state.doc);
    const ids = suggestions.map((entry) => entry.id).sort();

    expect(ids).toEqual(["block-1", "mark-1"]);
  });
});
