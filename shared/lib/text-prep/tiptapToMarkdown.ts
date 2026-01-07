import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";

type TiptapContent = Record<string, unknown>;

const markdownExtensions = [
  StarterKit.configure({
    codeBlock: {},
  }),
  Link,
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

export const tiptapToMarkdown = (content: TiptapContent): string => {
  try {
    const manager = new MarkdownManager({ extensions: markdownExtensions });
    return manager.serialize(content as Record<string, unknown>);
  } catch {
    return "";
  }
};
