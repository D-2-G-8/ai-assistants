"use client";

import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import EditorToolbarButton from "@/platform/editor/tiptap/EditorToolbarButton";

type EditorToolbarProps = {
  editor: Editor;
};

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as
      | string
      | undefined;
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

  return (
    <div className="sticky top-24 z-10 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <EditorToolbarButton
        label="H1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <EditorToolbarButton
        label="H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <EditorToolbarButton
        label="H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <EditorToolbarButton
        label="H4"
        active={editor.isActive("heading", { level: 4 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
      />
      <EditorToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <EditorToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <EditorToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={insertCodeBlock}
      />
      <EditorToolbarButton label="Link" onClick={setLink} />
      <EditorToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <EditorToolbarButton
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <EditorToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <EditorToolbarButton
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
  );
}
