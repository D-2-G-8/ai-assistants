"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Issue, Question } from "@/lib/schemas";
import type { QaEntry } from "@/lib/storage";

type RightPanelProps = {
  issues: Issue[];
  questions: Question[];
  ignoredIssueIds: string[];
  draftAnswers: Record<string, string>;
  sentAnswers: QaEntry[];
  onAnswerChange: (id: string, value: string) => void;
  onSendAnswer: (id: string) => void;
  onIgnoreIssue: (id: string) => void;
};

const severityBadge = (severity: Issue["severity"] | Question["severity"]) => {
  switch (severity) {
    case "blocker":
      return "bg-rose-100 text-rose-700";
    case "warning":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
};

export default function RightPanel({
  issues,
  questions,
  ignoredIssueIds,
  draftAnswers,
  sentAnswers,
  onAnswerChange,
  onSendAnswer,
  onIgnoreIssue,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "issues">(
    "questions"
  );

  const sentMap = useMemo(() => {
    return new Map(sentAnswers.map((entry) => [entry.id, entry.answer]));
  }, [sentAnswers]);

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            AI Assistant
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Review desk
          </h2>
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={clsx(
              "rounded-full px-3 py-1",
              activeTab === "questions"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            )}
          >
            Questions ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("issues")}
            className={clsx(
              "rounded-full px-3 py-1",
              activeTab === "issues"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            )}
          >
            Issues ({issues.length})
          </button>
        </div>
      </div>

      {activeTab === "questions" ? (
        <div className="flex flex-1 flex-col gap-3 overflow-auto">
          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No questions yet. Run a check to see what needs clarification.
            </div>
          ) : (
            questions.map((question) => {
              const value =
                draftAnswers[question.id] ?? sentMap.get(question.id) ?? "";
              const hasAnswer = sentMap.has(question.id);
              return (
                <div
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        severityBadge(question.severity)
                      )}
                    >
                      {question.severity}
                    </span>
                    {hasAnswer && (
                      <span className="text-xs font-semibold text-emerald-600">
                        Sent
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {question.question}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {question.reason}
                  </p>
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(event) =>
                      onAnswerChange(question.id, event.target.value)
                    }
                    placeholder="Type your answer for the next check..."
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => onSendAnswer(question.id)}
                    className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Send
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-auto">
          {issues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No issues yet. Run a check to highlight gaps and risks.
            </div>
          ) : (
            issues.map((issue) => {
              const ignored = ignoredIssueIds.includes(issue.id);
              return (
                <div
                  key={issue.id}
                  className={clsx(
                    "rounded-xl border p-4",
                    ignored
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        severityBadge(issue.severity)
                      )}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-xs text-slate-400">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {issue.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Fix: {issue.fix_suggestion}
                  </p>
                  {issue.quote && (
                    <p className="mt-2 text-xs italic text-slate-400">
                      &quot;{issue.quote}&quot;
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {issue.startHint || "No location hint"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIgnoreIssue(issue.id)}
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        ignored
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {ignored ? "Ignored" : "Ignore"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
