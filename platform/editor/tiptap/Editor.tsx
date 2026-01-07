"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import { TextSelection } from "@tiptap/pm/state";
import { createLowlight } from "lowlight";
import ts from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import { AiHighlight, buildHighlightRanges } from "@/platform/editor/tiptap/highlight";
import type { Finding } from "@/platform/artifacts/types";

type EditorProps = {
  content: Record<string, unknown>;
  findings: Finding[];
  ignoredFindingIds: string[];
  onUpdate: (content: Record<string, unknown>, text: string) => void;
  onReady?: (text: string) => void;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

const ToolbarButton = ({ label, active, onClick }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      "rounded-full border px-3 py-1 text-xs font-semibold transition",
      active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
    )}
  >
    {label}
  </button>
);

const lowlight = createLowlight();
lowlight.register("ts", ts);
lowlight.register("typescript", ts);
lowlight.register("json", json);

export default function Editor({
  content,
  findings,
  ignoredFindingIds,
  onUpdate,
  onReady,
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
          levels: [1, 2, 3],
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
        placeholder: "Start writing a doc the Confluence way...",
      }),
      AiHighlight,
    ],
    content,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
    onCreate({ editor }) {
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
    const updateFromSelection = () => {
      if (!editor.isFocused) {
        updateTableMenu(null);
        return;
      }

      const wrapper = editorWrapperRef.current;
      if (!wrapper) {
        updateTableMenu(null);
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
        return;
      }

      const cellRect = cell.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const top = cellRect.top - wrapperRect.top;
      const left = cellRect.right - wrapperRect.left;

      updateTableMenu({ top, left });
    };

    const handleBlur = () => {
      updateTableMenu(null);
    };

    editor.on("selectionUpdate", updateFromSelection);
    editor.on("blur", handleBlur);
    updateFromSelection();

    return () => {
      editor.off("selectionUpdate", updateFromSelection);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

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

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl || "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertCodeBlock = () => {
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const didSet = editor.chain().focus().setCodeBlock().run();
    if (didSet) return;

    const { state, view } = editor;
    const codeBlock = state.schema.nodes.codeBlock;
    if (!codeBlock) return;

    const { from, to } = state.selection;
    let tr = state.tr.replaceRangeWith(from, to, codeBlock.create());
    const nextPos = Math.min(tr.doc.content.size, from + 1);
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(nextPos)));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  };

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
      <div className="sticky top-24 z-10 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <ToolbarButton
          label="H1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          label="H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={insertCodeBlock}
        />
        <ToolbarButton label="Link" onClick={setLink} />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        />
      </div>
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
