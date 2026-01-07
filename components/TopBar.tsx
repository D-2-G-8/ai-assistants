"use client";

import clsx from "clsx";
import type { DocStatus } from "@/lib/storage";

type TopBarProps = {
  status: DocStatus;
  dirty: boolean;
  isChecking: boolean;
  isPreviewing: boolean;
  hasRunCheck: boolean;
  needsRerun: boolean;
  blockerCount: number;
  warningCount: number;
  suggestionCount: number;
  lastCheckedAt?: string;
  panelOpen: boolean;
  onRunCheck: () => void;
  onPreviewPrompt: () => void;
  onSaveReady: () => void;
  onTogglePanel: () => void;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function TopBar({
  status,
  dirty,
  isChecking,
  isPreviewing,
  hasRunCheck,
  needsRerun,
  blockerCount,
  warningCount,
  suggestionCount,
  lastCheckedAt,
  panelOpen,
  onRunCheck,
  onPreviewPrompt,
  onSaveReady,
  onTogglePanel,
}: TopBarProps) {
  const checkLabel = hasRunCheck ? "Re-run check" : "Run check";
  const isReady = status === "ready";

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onRunCheck}
          disabled={isChecking}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
            isChecking
              ? "bg-slate-200 text-slate-500"
              : "bg-amber-400 text-slate-900 hover:bg-amber-300",
            needsRerun && !isChecking && "ring-2 ring-amber-500/60"
          )}
        >
          {isChecking ? "Checking..." : checkLabel}
        </button>
        <button
          type="button"
          onClick={onPreviewPrompt}
          disabled={isPreviewing}
          className={clsx(
            "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
            isPreviewing
              ? "border-slate-200 bg-slate-100 text-slate-500"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
          )}
        >
          {isPreviewing ? "Preparing..." : "Preview prompt"}
        </button>
        <button
          type="button"
          onClick={onTogglePanel}
          aria-pressed={panelOpen}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400"
        >
          {panelOpen ? "Hide AI panel" : "Show AI panel"}
        </button>
        <button
          type="button"
          onClick={onSaveReady}
          disabled={blockerCount > 0}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
            blockerCount > 0
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-slate-900 text-white hover:bg-slate-800"
          )}
        >
          Save (Ready)
        </button>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isReady
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          )}
        >
          {isReady ? "Ready" : "Draft"}
        </span>
        {dirty && (
          <span className="text-xs font-semibold text-slate-600">
            Unsaved changes
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
            Blocker {blockerCount}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
            Warning {warningCount}
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
            Suggestion {suggestionCount}
          </span>
          {lastCheckedAt && (
            <span className="text-xs text-slate-500">
              Last check {formatDate(lastCheckedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
