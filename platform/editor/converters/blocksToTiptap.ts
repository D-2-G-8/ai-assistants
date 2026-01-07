import type { Block } from "@/platform/artifacts/types";

const createTextNode = (text: string) => ({
  type: "text",
  text,
});

const createParagraphNode = (text: string) => ({
  type: "paragraph",
  content: text ? [createTextNode(text)] : [],
});

const createHeadingNode = (text: string, level?: number) => ({
  type: "heading",
  attrs: { level: level ?? 2 },
  content: text ? [createTextNode(text)] : [],
});

export const blockToNode = (block: Block) => {
  if (block.type === "heading") {
    return createHeadingNode(block.text, block.level);
  }
  return createParagraphNode(block.text);
};

export const appendBlocksToDoc = (
  content: Record<string, unknown>,
  blocks: Block[]
) => {
  const doc = {
    ...content,
    type: "doc",
  } as { type?: string; content?: unknown[] };
  const existing = Array.isArray(doc.content) ? doc.content : [];
  const nodes = blocks.map(blockToNode);
  return {
    ...doc,
    content: [...existing, ...nodes],
  } as Record<string, unknown>;
};
