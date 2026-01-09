"use client";

import clsx from "clsx";
import type { AssistantProfile } from "@/platform/assistant-runtime/types";
import type { AssistantAction } from "@/platform/storage/types";

type RunAssistantPanelProps = {
  profile: AssistantProfile;
  action: AssistantAction;
  onActionChange?: (action: AssistantAction) => void;
  inputs: Record<string, string>;
  onInputsChange: (inputs: Record<string, string>) => void;
  isRunning: boolean;
  isPreviewing: boolean;
  hasRun: boolean;
  needsRerun: boolean;
  onRun: () => void;
  onPreviewPrompt: () => void;
};

export default function RunAssistantPanel({
  profile,
  action,
  onActionChange,
  inputs,
  onInputsChange,
  isRunning,
  isPreviewing,
  hasRun,
  needsRerun,
  onRun,
  onPreviewPrompt,
}: RunAssistantPanelProps) {
  const runLabel =
    action === "lint"
      ? hasRun
        ? "Re-run check"
        : "Run check"
      : `Run ${action}`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          AI actions
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          {profile.name}
        </h2>
        {profile.uiSchema.description && (
          <p className="text-xs text-slate-500">
            {profile.uiSchema.description}
          </p>
        )}
      </header>

      {profile.actions.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Action
          </label>
          <select
            value={action}
            onChange={(event) =>
              onActionChange?.(event.target.value as AssistantAction)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {profile.actions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {profile.uiSchema.fields.length > 0 && (
        <div className="flex flex-col gap-3">
          {profile.uiSchema.fields.map((field) => {
            const value = inputs[field.id] ?? field.defaultValue ?? "";
            if (field.type === "textarea") {
              return (
                <label key={field.id} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {field.label}
                  </span>
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(event) =>
                      onInputsChange({
                        ...inputs,
                        [field.id]: event.target.value,
                      })
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </label>
              );
            }

            if (field.type === "select") {
              return (
                <label key={field.id} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {field.label}
                  </span>
                  <select
                    value={value}
                    onChange={(event) =>
                      onInputsChange({
                        ...inputs,
                        [field.id]: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label key={field.id} className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  {field.label}
                </span>
                <input
                  value={value}
                  onChange={(event) =>
                    onInputsChange({
                      ...inputs,
                      [field.id]: event.target.value,
                    })
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className={clsx(
            "rounded-full px-4 py-2 text-xs font-semibold",
            isRunning
              ? "bg-slate-200 text-slate-500"
              : "bg-amber-400 text-slate-900 hover:bg-amber-300",
            needsRerun && !isRunning && "ring-2 ring-amber-500/60"
          )}
        >
          {isRunning ? "Running..." : runLabel}
        </button>
        <button
          type="button"
          onClick={onPreviewPrompt}
          disabled={isPreviewing}
          className={clsx(
            "rounded-full border px-4 py-2 text-xs font-semibold",
            isPreviewing
              ? "border-slate-200 bg-slate-100 text-slate-500"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
          )}
        >
          {isPreviewing ? "Preparing..." : "Preview prompt"}
        </button>
      </div>

      {needsRerun && !isRunning && (
        <p className="text-xs text-amber-700">
          Document changed since the last run.
        </p>
      )}

    </div>
  );
}
