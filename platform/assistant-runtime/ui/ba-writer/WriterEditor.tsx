"use client";

import { useDocumentRecord } from "@/shared/lib/document/useDocumentRecord";
import { DEFAULT_DOC_TITLE } from "@/platform/assistant-runtime/ui/ba-writer/modules/constants";
import WriterEditorContent from "@/platform/assistant-runtime/ui/ba-writer/WriterEditorContent";

type WriterEditorProps = {
  docId: string;
};

export default function WriterEditor({ docId }: WriterEditorProps) {
  const { doc, setDoc } = useDocumentRecord(docId, DEFAULT_DOC_TITLE);

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

  return <WriterEditorContent key={doc.id} doc={doc} onDocChange={setDoc} />;
}
