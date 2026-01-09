"use client";

import clsx from "clsx";
import type {
  BaWriterMissingInfo,
} from "@/shared/lib/ba-writer/types";
import type {
  SuggestionEntry,
} from "@/shared/lib/ba-writer/tiptap/utils";
import { SECTION_LABELS } from "@/platform/assistant-runtime/ui/ba-writer/modules/constants";

type WriterAssistantPanelProps = {
  notes: string;
  onNotesChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onUseFullDoc: () => void;
  selectionText: string;
  onUseSelection: () => void;
  suggestions: SuggestionEntry[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  missingInfo: BaWriterMissingInfo[];
  onInsertTodo: (item: BaWriterMissingInfo) => void;
};

export default function WriterAssistantPanel({
  notes,
  onNotesChange,
  onGenerate,
  isGenerating,
  onUseFullDoc,
  selectionText,
  onUseSelection,
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptAll,
  onRejectAll,
  missingInfo,
  onInsertTodo,
}: WriterAssistantPanelProps) {
  const suggestionCount = suggestions.length;
  const hasSelection = selectionText.trim().length > 0;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            BA-writer
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Generate suggestions
          </h2>
          <p className="text-xs text-slate-500">
            Use notes or the current document to propose structured updates.
          </p>
        </header>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-600">Notes</span>
          <textarea
            rows={6}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Paste BA notes or draft bullets..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold",
              isGenerating
                ? "bg-slate-200 text-slate-500"
                : "bg-amber-400 text-slate-900 hover:bg-amber-300"
            )}
          >
            {isGenerating ? "Generating..." : "Generate suggestions"}
          </button>
          <button
            type="button"
            onClick={onUseFullDoc}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            Use full doc
          </button>
          <button
            type="button"
            onClick={onUseSelection}
            disabled={!hasSelection}
            className={clsx(
              "rounded-full border px-3 py-2 text-xs font-semibold",
              hasSelection
                ? "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                : "border-slate-200 bg-slate-100 text-slate-400"
            )}
          >
            Use selection
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Suggestions
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {suggestionCount > 0
                ? `${suggestionCount} pending`
                : "No suggestions"}
            </h2>
          </div>
          {suggestionCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAcceptAll}
                className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={onRejectAll}
                className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700"
              >
                Reject all
              </button>
            </div>
          )}
        </div>

        {suggestionCount === 0 ? (
          <p className="text-xs text-slate-500">
            Run BA-writer to generate structured suggestions.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-xl border border-slate-200 bg-white/90 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {suggestion.kind.replace("_", " ")}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {suggestion.reason || "Suggested change"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ID {suggestion.id}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion(suggestion.id)}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(suggestion.id)}
                      className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {typeof suggestion.confidence === "number" && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Confidence {Math.round(suggestion.confidence * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Missing info
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {missingInfo.length > 0
              ? `${missingInfo.length} open questions`
              : "No open questions"}
          </h2>
        </header>

        {missingInfo.length === 0 ? (
          <p className="text-xs text-slate-500">
            BA-writer did not flag missing info for now.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {missingInfo.map((item, index) => (
              <div
                key={`${item.sectionId}-${index}`}
                className="rounded-xl border border-slate-200 bg-white/90 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {SECTION_LABELS[item.sectionId]}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.question}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Priority {item.priority}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInsertTodo(item)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Insert TODO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
