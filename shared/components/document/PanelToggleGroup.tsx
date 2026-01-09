"use client";

import clsx from "clsx";

type PanelView = "assistant" | "history" | "none";

type PanelToggleGroupProps = {
  panelView: PanelView;
  onToggleAssistantPanel: () => void;
  onToggleHistoryPanel: () => void;
};

export default function PanelToggleGroup({
  panelView,
  onToggleAssistantPanel,
  onToggleHistoryPanel,
}: PanelToggleGroupProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
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
  );
}
