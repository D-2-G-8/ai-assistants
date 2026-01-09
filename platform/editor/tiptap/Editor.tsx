"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import type { Editor as TiptapEditor, Extensions } from "@tiptap/core";
import { createLowlight } from "lowlight";
import ts from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import { AiHighlight, buildHighlightRanges } from "@/platform/editor/tiptap/highlight";
import EditorToolbar from "@/platform/editor/tiptap/EditorToolbar";
import type { Finding } from "@/platform/artifacts/types";

type EditorProps = {
  content: Record<string, unknown>;
  findings?: Finding[];
  ignoredFindingIds?: string[];
  onUpdate: (content: Record<string, unknown>, text: string) => void;
  onReady?: (text: string) => void;
  onEditorReady?: (editor: TiptapEditor) => void;
  onSelectionTextChange?: (text: string) => void;
  placeholder?: string;
  extensions?: Extensions;
};

const lowlight = createLowlight();
lowlight.register("ts", ts);
lowlight.register("typescript", ts);
lowlight.register("json", json);

export default function Editor({
  content,
  findings = [],
  ignoredFindingIds = [],
  onUpdate,
  onReady,
  onEditorReady,
  onSelectionTextChange,
  placeholder = "Start writing a doc the Confluence way...",
  extensions = [],
}: EditorProps) {
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const [tableMenu, setTableMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TableKit.configure({
        table: {
          resizable: true,
          renderWrapper: true,
          HTMLAttributes: {
            class: "ba-table",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      ...extensions,
      AiHighlight,
    ],
    content,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
    onCreate({ editor }) {
      onEditorReady?.(editor);
      onReady?.(editor.getText());
    },
    onUpdate({ editor }) {
      onUpdate(editor.getJSON() as Record<string, unknown>, editor.getText());
    },
  });

  const updateTableMenu = (next: { top: number; left: number } | null) => {
    setTableMenu((prev) => {
      if (!next) return null;
      if (
        prev &&
        Math.abs(prev.top - next.top) < 1 &&
        Math.abs(prev.left - next.left) < 1
      ) {
        return prev;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!editor) return;

    const updateSelectionText = () => {
      if (!onSelectionTextChange) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        onSelectionTextChange("");
        return;
      }
      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      onSelectionTextChange(text);
    };

    const updateFromSelection = () => {
      if (!editor.isFocused) {
        updateTableMenu(null);
        updateSelectionText();
        return;
      }

      const wrapper = editorWrapperRef.current;
      if (!wrapper) {
        updateTableMenu(null);
        updateSelectionText();
        return;
      }

      const { selection } = editor.state;
      const domAtPos = editor.view.domAtPos(selection.$from.pos);
      const target = domAtPos.node instanceof HTMLElement
        ? domAtPos.node
        : domAtPos.node.parentElement;
      const cell = target?.closest("td, th") as HTMLElement | null;

      if (!cell) {
        updateTableMenu(null);
        updateSelectionText();
        return;
      }

      const cellRect = cell.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const top = cellRect.top - wrapperRect.top;
      const left = cellRect.right - wrapperRect.left;

      updateTableMenu({ top, left });
      updateSelectionText();
    };

    const handleBlur = () => {
      updateTableMenu(null);
      updateSelectionText();
    };

    editor.on("selectionUpdate", updateFromSelection);
    editor.on("blur", handleBlur);
    updateFromSelection();

    return () => {
      editor.off("selectionUpdate", updateFromSelection);
      editor.off("blur", handleBlur);
    };
  }, [editor, onSelectionTextChange]);

  useEffect(() => {
    if (!editor) return;
    const filtered = findings.filter(
      (finding) => !ignoredFindingIds.includes(finding.id)
    );
    const { ranges } = buildHighlightRanges(editor.state.doc, filtered);
    editor.commands.setHighlights(ranges);
  }, [editor, findings, ignoredFindingIds]);

  if (!editor) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading editor...
      </div>
    );
  }

  const deleteRow = () => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
    updateTableMenu(null);
  };

  const deleteColumn = () => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
    updateTableMenu(null);
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <EditorToolbar editor={editor} />
      <div
        ref={editorWrapperRef}
        className="relative flex-1 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm"
      >
        <EditorContent editor={editor} />
        {tableMenu && (
          <div
            className="table-hover-menu absolute z-20 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
            style={{
              top: tableMenu.top,
              left: tableMenu.left,
              transform: "translate(-100%, -110%)",
            }}
          >
            <button
              type="button"
              onClick={deleteRow}
              onMouseDown={(event) => event.preventDefault()}
              className="rounded-full px-2 py-0.5 transition hover:bg-slate-100"
            >
              Delete row
            </button>
            <button
              type="button"
              onClick={deleteColumn}
              onMouseDown={(event) => event.preventDefault()}
              className="rounded-full px-2 py-0.5 transition hover:bg-slate-100"
            >
              Delete column
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
