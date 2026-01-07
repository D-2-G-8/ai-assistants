"use client";

import { useParams } from "next/navigation";
import DocumentEditorShell from "@/features/document/DocumentEditorShell";

export default function DocumentPage() {
  const params = useParams();
  const docId = typeof params.id === "string" ? params.id : params.id?.[0];

  if (!docId) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

  return <DocumentEditorShell docId={docId} />;
}
