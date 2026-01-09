"use client";

import clsx from "clsx";
import PanelToggleGroup from "@/shared/components/document/PanelToggleGroup";
import type { WorkflowStage } from "@/shared/lib/document/workflow";

type WriterTopBarProps = {
  stage: WorkflowStage;
  dirty: boolean;
  onSendToReview: () => void;
  panelView: "assistant" | "history" | "none";
  onToggleAssistantPanel: () => void;
  onToggleHistoryPanel: () => void;
};

export default function WriterTopBar({
  stage,
  dirty,
  onSendToReview,
  panelView,
  onToggleAssistantPanel,
  onToggleHistoryPanel,
}: WriterTopBarProps) {
  const stageLabel =
    stage === "ready" ? "Ready" : stage === "review" ? "In review" : "Drafting";
  const stageClasses =
    stage === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : stage === "review"
        ? "bg-sky-100 text-sky-800"
        : "bg-amber-100 text-amber-900";
  const actionLabel =
    stage === "review" && !dirty ? "Open reviewer" : "Save & review";

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onSendToReview}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          {actionLabel}
        </button>
        <span
          className={clsx("rounded-full px-3 py-1 text-xs font-semibold", stageClasses)}
        >
          {stageLabel}
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
