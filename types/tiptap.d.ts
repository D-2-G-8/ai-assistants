import "@tiptap/core";
import type { HighlightRange } from "@/platform/editor/tiptap/highlight";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiHighlight: {
      setHighlights: (ranges: HighlightRange[]) => ReturnType;
      clearHighlights: () => ReturnType;
    };
  }
}
