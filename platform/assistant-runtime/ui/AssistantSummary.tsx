"use client";

type AssistantSummaryProps = {
  blockerCount: number;
  warningCount: number;
  suggestionCount: number;
  lastCheckedAt?: string;
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

export default function AssistantSummary({
  blockerCount,
  warningCount,
  suggestionCount,
  lastCheckedAt,
}: AssistantSummaryProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Assistant summary
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">
          Blocker {blockerCount}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
          Warning {warningCount}
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
          Suggestion {suggestionCount}
        </span>
      </div>
      {lastCheckedAt ? (
        <span className="text-[11px] text-slate-500">
          Last run {formatDate(lastCheckedAt)}
        </span>
      ) : (
        <span className="text-[11px] text-slate-400">
          No runs yet for this document.
        </span>
      )}
    </div>
  );
}
