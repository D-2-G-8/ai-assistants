"use client";

import type { ReactNode } from "react";
import type { PrepareTextResult } from "@/lib/text-prep";

type SanitizePreviewProps = {
  input: string;
  prepared: PrepareTextResult;
  onInputChange?: (value: string) => void;
  header?: ReactNode;
};

export default function SanitizePreview({
  input,
  prepared,
  onInputChange,
  header,
}: SanitizePreviewProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6">
      {header}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Raw input
          </label>
          <textarea
            value={input}
            onChange={(event) => onInputChange?.(event.target.value)}
            readOnly={!onInputChange}
            className="min-h-[260px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Paste doc text here..."
          />
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Sanitized output
          </label>
          <pre className="min-h-[260px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100 shadow-sm">
            {prepared.cleanedText || "(empty)"}
          </pre>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Outline</h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
              {prepared.outline.length === 0 && <li>(none)</li>}
              {prepared.outline.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Warnings</h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {prepared.warnings.length === 0 && <li>(none)</li>}
              {prepared.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Stats</h2>
            <dl className="mt-2 space-y-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <dt>Chars</dt>
                <dd>{prepared.stats.chars}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Lines</dt>
                <dd>{prepared.stats.lines}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Approx tokens</dt>
                <dd>{prepared.stats.approxTokens}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
