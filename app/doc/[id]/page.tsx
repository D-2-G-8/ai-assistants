"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useParams, useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import RightPanel from "@/components/RightPanel";
import TopBar from "@/components/TopBar";
import SanitizePreview from "@/components/SanitizePreview";
import { prepareText } from "@/lib/text-prep";
import {
  createDoc,
  getDoc,
  upsertDoc,
  type DocRecord,
  type QaEntry,
} from "@/lib/storage";
import type { Issue, Question } from "@/lib/schemas";

export default function DocPage() {
  const params = useParams();
  const router = useRouter();
  const docId = typeof params.id === "string" ? params.id : params.id?.[0];

  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [needsRerun, setNeedsRerun] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lintError, setLintError] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [docText, setDocText] = useState<string>("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [promptPreview, setPromptPreview] = useState<string>("");

  useEffect(() => {
    if (!docId) return;
    const existing = getDoc(docId) || createDoc(docId);
    setDoc(existing);
    setIssues([]);
    setQuestions([]);
    setNeedsRerun(false);
    setDirty(false);
    setLintError(null);
    setDraftAnswers(
      (existing.qa || []).reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.answer;
        return acc;
      }, {})
    );
  }, [docId]);

  useEffect(() => {
    if (!questions.length || !doc) return;
    setDraftAnswers((prev) => {
      const next = { ...prev };
      questions.forEach((question) => {
        if (next[question.id] !== undefined) return;
        const existing = doc.qa?.find((entry) => entry.id === question.id);
        if (existing) {
          next[question.id] = existing.answer;
        }
      });
      return next;
    });
  }, [questions, doc]);

  const effectiveIssues = useMemo(() => {
    if (!doc) return issues;
    const ignored = new Set(doc.ignoredIssueIds || []);
    return issues.filter((issue) => !ignored.has(issue.id));
  }, [doc, issues]);

  const blockerCount = effectiveIssues.filter(
    (issue) => issue.severity === "blocker"
  ).length;
  const warningCount = effectiveIssues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const suggestionCount = effectiveIssues.filter(
    (issue) => issue.severity === "suggestion"
  ).length;

  const handleEditorUpdate = (content: Record<string, unknown>, text: string) => {
    if (!doc) return;
    const updated: DocRecord = {
      ...doc,
      content,
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    setDoc(updated);
    upsertDoc(updated);
    setDocText(text);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleTitleChange = (value: string) => {
    if (!doc) return;
    const updated: DocRecord = {
      ...doc,
      title: value,
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    setDoc(updated);
    upsertDoc(updated);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleRunCheck = async () => {
    if (!doc) return;
    setIsChecking(true);
    setLintError(null);
    try {
      const response = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc.title,
          content: docText,
          contentJson: doc.content,
          status: doc.status,
          qaContext: doc.qa?.filter((entry) => entry.answer.trim().length > 0),
        }),
      });

      const data = (await response.json()) as {
        issues?: Issue[];
        questions?: Question[];
      };

      const errorHeader = response.headers.get("x-lint-error");
      if (errorHeader) {
        setLintError(errorHeader);
      }

      setIssues(data.issues || []);
      setQuestions(data.questions || []);
      setNeedsRerun(false);

      const updated: DocRecord = {
        ...doc,
        lastCheckedAt: new Date().toISOString(),
        lastCheckedBy: "You",
        status: (data.issues || []).length > 0 ? "draft" : doc.status,
      };

      setDoc(updated);
      upsertDoc(updated);
    } catch (error) {
      setLintError((error as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePreviewPrompt = async () => {
    if (!doc) return;
    setIsPreviewing(true);
    setLintError(null);
    try {
      const response = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc.title,
          content: docText,
          contentJson: doc.content,
          status: doc.status,
          dryRun: true,
          qaContext: doc.qa?.filter((entry) => entry.answer.trim().length > 0),
        }),
      });

      const data = (await response.json()) as {
        userPrompt?: string;
        fullPrompt?: string;
      };

      const errorHeader = response.headers.get("x-lint-error");
      if (errorHeader) {
        setLintError(errorHeader);
      }
      setPromptPreview(data.fullPrompt || data.userPrompt || "");
    } catch (error) {
      setLintError((error as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSaveReady = () => {
    if (!doc || blockerCount > 0) return;
    const updated: DocRecord = {
      ...doc,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    setDoc(updated);
    upsertDoc(updated);
    setDirty(false);
  };

  const handleAnswerChange = (id: string, value: string) => {
    setDraftAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSendAnswer = (id: string) => {
    if (!doc) return;
    const question = questions.find((item) => item.id === id);
    if (!question) return;
    const answer = (draftAnswers[id] || "").trim();
    if (!answer) return;

    const updatedQa: QaEntry[] = [
      ...(doc.qa || []).filter((entry) => entry.id !== id),
      { id, question: question.question, answer },
    ];

    const updated: DocRecord = {
      ...doc,
      qa: updatedQa,
      updatedAt: new Date().toISOString(),
    };

    setDoc(updated);
    upsertDoc(updated);
    setNeedsRerun(true);
  };

  const prepared = useMemo(() => prepareText(docText), [docText]);

  const handleIgnoreIssue = (id: string) => {
    if (!doc) return;
    const ignored = new Set(doc.ignoredIssueIds || []);
    if (ignored.has(id)) {
      ignored.delete(id);
    } else {
      ignored.add(id);
    }
    const updated: DocRecord = {
      ...doc,
      ignoredIssueIds: Array.from(ignored),
      updatedAt: new Date().toISOString(),
    };
    setDoc(updated);
    upsertDoc(updated);
  };

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f3ea] via-[#f0f9ff] to-[#f7f4ec]">
      <TopBar
        status={doc.status}
        dirty={dirty}
        isChecking={isChecking}
        isPreviewing={isPreviewing}
        hasRunCheck={Boolean(doc.lastCheckedAt)}
        needsRerun={needsRerun}
        blockerCount={blockerCount}
        warningCount={warningCount}
        suggestionCount={suggestionCount}
        lastCheckedAt={doc.lastCheckedAt}
        panelOpen={isPanelOpen}
        onRunCheck={handleRunCheck}
        onPreviewPrompt={handlePreviewPrompt}
        onSaveReady={handleSaveReady}
        onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
        >
          Back to documents
        </button>

        <div className="flex flex-col gap-2">
          <input
            value={doc.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-2xl font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Document title"
          />
          {lintError && (
            <p className="text-xs font-semibold text-rose-600">
              Lint error: {lintError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Editor
            key={doc.id}
            content={doc.content}
            issues={effectiveIssues}
            ignoredIssueIds={doc.ignoredIssueIds || []}
            onUpdate={handleEditorUpdate}
            onReady={(text) => setDocText(text)}
          />
        </div>

        <SanitizePreview
          input={docText}
          prepared={prepared}
          header={
            <header className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Sanitize preview
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Raw input to sanitized output
              </h2>
              <p className="text-sm text-slate-500">
                Inspect how the current document is normalized before linting.
              </p>
            </header>
          }
        />

        {promptPreview && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Prompt preview
            </h2>
            <pre className="mt-2 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
              {promptPreview}
            </pre>
          </div>
        )}

        <div
          className={clsx(
            "fixed right-4 top-20 bottom-4 z-40 w-[360px] max-w-[92vw] transition-all duration-200 ease-out",
            isPanelOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-[120%] opacity-0 pointer-events-none"
          )}
          aria-hidden={!isPanelOpen}
        >
          <RightPanel
            issues={issues}
            questions={questions}
            ignoredIssueIds={doc.ignoredIssueIds || []}
            draftAnswers={draftAnswers}
            sentAnswers={doc.qa || []}
            onAnswerChange={handleAnswerChange}
            onSendAnswer={handleSendAnswer}
            onIgnoreIssue={handleIgnoreIssue}
          />
        </div>
      </div>
    </div>
  );
}
