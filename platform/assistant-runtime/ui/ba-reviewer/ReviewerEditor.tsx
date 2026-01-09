"use client";

import { useDocumentRecord } from "@/shared/lib/document/useDocumentRecord";
import { DEFAULT_DOC_TITLE } from "@/shared/lib/ba-reviewer/constants";
import ReviewerEditorContent from "@/platform/assistant-runtime/ui/ba-reviewer/ReviewerEditorContent";

type ReviewerEditorProps = {
  docId: string;
};

export default function ReviewerEditor({ docId }: ReviewerEditorProps) {
  const { doc, setDoc } = useDocumentRecord(docId, DEFAULT_DOC_TITLE);

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

  return <ReviewerEditorContent key={doc.id} doc={doc} onDocChange={setDoc} />;
}
