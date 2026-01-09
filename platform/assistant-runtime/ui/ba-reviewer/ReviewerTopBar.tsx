"use client";

import clsx from "clsx";
import PanelToggleGroup from "@/shared/components/document/PanelToggleGroup";
import type { DocStatus } from "@/platform/storage/types";

type ReviewerTopBarProps = {
  status: DocStatus;
  dirty: boolean;
  panelView: "assistant" | "history" | "none";
  saveDisabled: boolean;
  onSaveReady: () => void;
  onToggleAssistantPanel: () => void;
  onToggleHistoryPanel: () => void;
};

export default function ReviewerTopBar({
  status,
  dirty,
  panelView,
  saveDisabled,
  onSaveReady,
  onToggleAssistantPanel,
  onToggleHistoryPanel,
}: ReviewerTopBarProps) {
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
        <div className="ml-auto">
          <PanelToggleGroup
            panelView={panelView}
            onToggleAssistantPanel={onToggleAssistantPanel}
            onToggleHistoryPanel={onToggleHistoryPanel}
          />
        </div>
      </div>
    </div>
  );
}
