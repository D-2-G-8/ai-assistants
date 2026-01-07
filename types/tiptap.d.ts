import "@tiptap/core";
import type { HighlightRange } from "@/lib/highlight";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiHighlight: {
      setHighlights: (ranges: HighlightRange[]) => ReturnType;
      clearHighlights: () => ReturnType;
    };
  }
}
