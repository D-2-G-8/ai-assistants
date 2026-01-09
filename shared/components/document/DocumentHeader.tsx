"use client";

import type { DocumentRecord } from "@/platform/storage/types";
import { formatDate } from "@/shared/lib/utils/formatDate";

type DocumentHeaderProps = {
  doc: DocumentRecord;
  onTitleChange: (value: string) => void;
  errorMessage?: string | null;
  errorLabel?: string;
};

export default function DocumentHeader({
  doc,
  onTitleChange,
  errorMessage,
  errorLabel = "Assistant error",
}: DocumentHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={doc.title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="flex-1 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-2xl font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          placeholder="Document title"
        />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {doc.docType}
        </span>
        <span className="text-xs text-slate-500">
          v{doc.versionId.slice(0, 6)}
        </span>
      </div>
      {errorMessage && (
        <p className="text-xs font-semibold text-rose-600">
          {errorLabel}: {errorMessage}
        </p>
      )}
      {doc.updatedAt && (
        <p className="text-[11px] text-slate-500">
          Last updated {formatDate(doc.updatedAt, { includeYear: true })}
        </p>
      )}
    </div>
  );
}
