"use client";

import clsx from "clsx";
import type { DocStatus } from "@/platform/storage/types";

type TopBarProps = {
  status: DocStatus;
  dirty: boolean;
  panelView: "assistant" | "history" | "none";
  saveDisabled: boolean;
  onSaveReady: () => void;
  onToggleAssistantPanel: () => void;
  onToggleHistoryPanel: () => void;
};

export default function TopBar({
  status,
  dirty,
  panelView,
  saveDisabled,
  onSaveReady,
  onToggleAssistantPanel,
  onToggleHistoryPanel,
}: TopBarProps) {
  const isReady = status === "ready";

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onSaveReady}
          disabled={saveDisabled}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition",
            saveDisabled
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
        <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={onToggleAssistantPanel}
            aria-pressed={panelView === "assistant"}
            className={clsx(
              "rounded-full border px-3 py-1 transition",
              panelView === "assistant"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            )}
          >
            AI panel
          </button>
          <button
            type="button"
            onClick={onToggleHistoryPanel}
            aria-pressed={panelView === "history"}
            className={clsx(
              "rounded-full border px-3 py-1 transition",
              panelView === "history"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            )}
          >
            History
          </button>
        </div>
      </div>
    </div>
  );
}
