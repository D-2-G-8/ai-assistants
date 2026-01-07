"use client";

import type { RunRecord } from "@/platform/storage/types";

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type RunHistoryPanelProps = {
  runs: RunRecord[];
};

export default function RunHistoryPanel({ runs }: RunHistoryPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Run history
      </h3>
      {runs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          No runs yet. Trigger a lint to see history.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.slice(0, 5).map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <div>
                <p className="font-semibold text-slate-700">
                  {run.action} · {run.status}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatDate(run.createdAt)}
                </p>
              </div>
              {run.result && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  {run.result.findings.length} findings
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
