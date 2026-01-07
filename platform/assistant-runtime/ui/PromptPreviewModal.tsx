"use client";

import { useEffect } from "react";

type PromptPreviewModalProps = {
  open: boolean;
  content: string;
  onClose: () => void;
};

export default function PromptPreviewModal({
  open,
  content,
  onClose,
}: PromptPreviewModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close prompt preview"
        className="absolute inset-0 cursor-default bg-slate-950/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-preview-title"
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Assistant
            </p>
            <h2
              id="prompt-preview-title"
              className="text-lg font-semibold text-slate-900"
            >
              Prompt preview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:border-slate-400"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
            {content || "No prompt preview available yet."}
          </pre>
        </div>
      </div>
    </div>
  );
}
