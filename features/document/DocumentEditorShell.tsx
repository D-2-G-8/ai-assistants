"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import Editor from "@/platform/editor/tiptap/Editor";
import RunAssistantPanel from "@/platform/assistant-runtime/ui/RunAssistantPanel";
import RunHistoryPanel from "@/platform/assistant-runtime/ui/RunHistoryPanel";
import AssistantSummary from "@/platform/assistant-runtime/ui/AssistantSummary";
import ArtifactsPanel from "@/platform/assistant-runtime/ui/ArtifactsPanel";
import PromptPreviewModal from "@/platform/assistant-runtime/ui/PromptPreviewModal";
import FindingsList from "@/features/review/FindingsList";
import TopBar from "@/features/document/TopBar";
import { documentStore } from "@/platform/storage/documentStore";
import { runStore } from "@/platform/storage/runStore";
import { resolveAssistantProfile } from "@/platform/assistant-runtime/registry";
import { applyArtifactToContent } from "@/platform/artifacts/apply";
import { createId } from "@/shared/lib/id";
import type { Artifact, Finding } from "@/platform/artifacts/types";
import type {
  AssistantAction,
  DocumentRecord,
  QaEntry,
  RunRecord,
} from "@/platform/storage/types";

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type DocumentEditorShellProps = {
  docId: string;
};

export default function DocumentEditorShell({ docId }: DocumentEditorShellProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [needsRerun, setNeedsRerun] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [docText, setDocText] = useState<string>("");
  const [panelView, setPanelView] = useState<"assistant" | "history" | "none">(
    "assistant"
  );
  const [promptPreview, setPromptPreview] = useState<string>("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [action, setAction] = useState<AssistantAction>("lint");
  const [panelInputs, setPanelInputs] = useState<Record<string, string>>({});
  const [editorResetKey, setEditorResetKey] = useState(0);

  const runSnapshot = useSyncExternalStore(
    runStore.subscribe,
    runStore.getSnapshot,
    runStore.getServerSnapshot
  );

  const runHistory = useMemo<RunRecord[]>(() => {
    return runSnapshot
      .filter((run) => run.documentId === docId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [runSnapshot, docId]);

  useEffect(() => {
    if (!docId) return;
    const existing = documentStore.get(docId) ||
      documentStore.create(docId, { title: "New Product Doc" });
    setDoc(existing);
    setFindings([]);
    setArtifacts([]);
    setNeedsRerun(false);
    setDirty(false);
    setAssistantError(null);
    setPromptPreview("");
    setIsPromptOpen(false);
    setDraftAnswers(
      (existing.qa || []).reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.answer;
        return acc;
      }, {})
    );
  }, [docId]);

  useEffect(() => {
    if (!findings.length || !doc) return;
    const questions = findings.filter((item) => item.kind === "question");
    if (questions.length === 0) return;
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
  }, [findings, doc]);

  const effectiveFindings = useMemo(() => {
    if (!doc) return findings;
    const ignored = new Set(doc.ignoredFindingIds || []);
    return findings.filter((finding) => !ignored.has(finding.id));
  }, [doc, findings]);

  const blockerCount = effectiveFindings.filter(
    (finding) => finding.severity === "error"
  ).length;
  const warningCount = effectiveFindings.filter(
    (finding) => finding.severity === "warn"
  ).length;
  const suggestionCount = effectiveFindings.filter(
    (finding) => finding.severity === "info"
  ).length;

  const profile = useMemo(() => {
    if (!doc) return null;
    return resolveAssistantProfile({
      docType: doc.docType,
      action,
    });
  }, [doc, action]);

  const handleEditorUpdate = (content: Record<string, unknown>, text: string) => {
    if (!doc) return;
    const updated: DocumentRecord = {
      ...doc,
      content,
      versionId: createId(),
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    setDoc(updated);
    documentStore.upsert(updated);
    setDocText(text);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleTitleChange = (value: string) => {
    if (!doc) return;
    const updated: DocumentRecord = {
      ...doc,
      title: value,
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    setDoc(updated);
    documentStore.upsert(updated);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleRun = async () => {
    if (!doc || !profile) return;
    setIsRunning(true);
    setAssistantError(null);

    try {
      const response = await fetch("/api/assistant/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          action,
          assistantProfileId: profile.id,
          inputs: {
            ...panelInputs,
            qaContext: doc.qa?.filter((entry) => entry.answer.trim().length > 0),
          },
          document: {
            title: doc.title,
            docType: doc.docType,
            content: doc.content,
            contentText: docText,
            meta: doc.meta,
            versionId: doc.versionId,
          },
        }),
      });

      const data = (await response.json()) as {
        run?: RunRecord;
        result?: { findings?: Finding[]; artifacts?: Artifact[] };
      };

      const errorHeader = response.headers.get("x-run-error");
      if (errorHeader) {
        setAssistantError(errorHeader);
      }

      const resultFindings = data.result?.findings || [];
      const resultArtifacts = data.result?.artifacts || [];

      setFindings(resultFindings);
      setArtifacts(resultArtifacts);
      setNeedsRerun(false);

      if (data.run) {
        runStore.add(data.run);
      }

      const updated: DocumentRecord = {
        ...doc,
        lastCheckedAt: new Date().toISOString(),
        lastCheckedBy: "You",
        status: resultFindings.some((finding) => finding.severity === "error")
          ? "draft"
          : doc.status,
      };

      setDoc(updated);
      documentStore.upsert(updated);
    } catch (error) {
      setAssistantError((error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreviewPrompt = async () => {
    if (!doc || !profile) return;
    setIsPreviewing(true);
    setAssistantError(null);

    try {
      const response = await fetch("/api/assistant/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          action,
          assistantProfileId: profile.id,
          inputs: {
            ...panelInputs,
            qaContext: doc.qa?.filter((entry) => entry.answer.trim().length > 0),
          },
          document: {
            title: doc.title,
            docType: doc.docType,
            content: doc.content,
            contentText: docText,
            meta: doc.meta,
            versionId: doc.versionId,
          },
          dryRun: true,
        }),
      });

      const data = (await response.json()) as {
        promptSnapshot?: { system: string; user: string };
      };

      const errorHeader = response.headers.get("x-run-error");
      if (errorHeader) {
        setAssistantError(errorHeader);
      }

      if (data.promptSnapshot) {
        setPromptPreview(
          `${data.promptSnapshot.system}\n\n${data.promptSnapshot.user}`
        );
        setIsPromptOpen(true);
      }
    } catch (error) {
      setAssistantError((error as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSaveReady = () => {
    if (!doc || blockerCount > 0) return;
    const updated: DocumentRecord = {
      ...doc,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    setDoc(updated);
    documentStore.upsert(updated);
    setDirty(false);
  };

  const handleAnswerChange = (id: string, value: string) => {
    setDraftAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSendAnswer = (id: string) => {
    if (!doc) return;
    const question = findings.find((item) => item.id === id);
    if (!question) return;
    const answer = (draftAnswers[id] || "").trim();
    if (!answer) return;

    const updatedQa: QaEntry[] = [
      ...(doc.qa || []).filter((entry) => entry.id !== id),
      { id, question: question.message, answer },
    ];

    const updated: DocumentRecord = {
      ...doc,
      qa: updatedQa,
      updatedAt: new Date().toISOString(),
    };

    setDoc(updated);
    documentStore.upsert(updated);
    setNeedsRerun(true);
  };

  const handleIgnoreFinding = (id: string) => {
    if (!doc) return;
    const ignored = new Set(doc.ignoredFindingIds || []);
    if (ignored.has(id)) {
      ignored.delete(id);
    } else {
      ignored.add(id);
    }
    const updated: DocumentRecord = {
      ...doc,
      ignoredFindingIds: Array.from(ignored),
      updatedAt: new Date().toISOString(),
    };
    setDoc(updated);
    documentStore.upsert(updated);
  };

  const handleApplyArtifact = (artifact: Artifact) => {
    if (!doc) return;
    const result = applyArtifactToContent(doc.content, artifact);
    if (result.error) {
      setAssistantError(result.error);
      return;
    }

    const updated: DocumentRecord = {
      ...doc,
      content: result.content,
      versionId: createId(),
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };

    setDoc(updated);
    documentStore.upsert(updated);
    setDirty(true);
    setNeedsRerun(true);
    setEditorResetKey((prev) => prev + 1);
  };


  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

  if (doc.docType === "testcase") {
    return (
      <div className="min-h-screen bg-slate-50 p-10 text-slate-600">
        <h1 className="text-2xl font-semibold text-slate-900">Test cases</h1>
        <p className="mt-2 text-sm text-slate-500">
          This flow is being built. Test cases will be generated from business
          and technical docs and published to TestOps.
        </p>
      </div>
    );
  }

  if (doc.docType === "autotest") {
    return (
      <div className="min-h-screen bg-slate-50 p-10 text-slate-600">
        <h1 className="text-2xl font-semibold text-slate-900">Autotests</h1>
        <p className="mt-2 text-sm text-slate-500">
          This flow is being built. Autotests will be generated from test cases
          and opened as merge requests in the autotest repository.
        </p>
      </div>
    );
  }

  if (doc.docType === "code") {
    return (
      <div className="min-h-screen bg-slate-50 p-10 text-slate-600">
        <h1 className="text-2xl font-semibold text-slate-900">Code delivery</h1>
        <p className="mt-2 text-sm text-slate-500">
          This flow is being built. Code changes will be drafted from business
          and technical docs and opened as merge requests in service repos.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f3ea] via-[#f0f9ff] to-[#f7f4ec]">
      <TopBar
        status={doc.status}
        dirty={dirty}
        panelView={panelView}
        saveDisabled={blockerCount > 0}
        onSaveReady={handleSaveReady}
        onToggleAssistantPanel={() =>
          setPanelView((prev) => (prev === "assistant" ? "none" : "assistant"))
        }
        onToggleHistoryPanel={() =>
          setPanelView((prev) => (prev === "history" ? "none" : "history"))
        }
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={doc.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-2xl font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Document title"
            />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {doc.docType}
            </span>
            <span className="text-xs text-slate-500">
              v{doc.versionId.slice(0, 6)}
            </span>
          </div>
          {assistantError && (
            <p className="text-xs font-semibold text-rose-600">
              Assistant error: {assistantError}
            </p>
          )}
          {doc.updatedAt && (
            <p className="text-[11px] text-slate-500">
              Last updated {formatDate(doc.updatedAt)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Editor
              key={`${doc.id}-${editorResetKey}`}
              content={doc.content}
              findings={effectiveFindings}
              ignoredFindingIds={doc.ignoredFindingIds || []}
              onUpdate={handleEditorUpdate}
              onReady={(text) => setDocText(text)}
            />

          </div>

          <aside
            className={clsx(
              "flex w-full flex-col gap-4 lg:w-[360px]",
              panelView === "none" && "hidden"
            )}
          >
            {panelView === "assistant" && (
              <>
                {profile && (
                  <RunAssistantPanel
                    profile={profile}
                    action={action}
                    onActionChange={setAction}
                    inputs={panelInputs}
                    onInputsChange={setPanelInputs}
                    isRunning={isRunning}
                    isPreviewing={isPreviewing}
                    hasRun={Boolean(doc.lastCheckedAt)}
                    needsRerun={needsRerun}
                    onRun={handleRun}
                    onPreviewPrompt={handlePreviewPrompt}
                  />
                )}
                <AssistantSummary
                  blockerCount={blockerCount}
                  warningCount={warningCount}
                  suggestionCount={suggestionCount}
                  lastCheckedAt={doc.lastCheckedAt}
                />
                {(action !== "lint" || artifacts.length > 0) && (
                  <ArtifactsPanel
                    artifacts={artifacts}
                    onApplyArtifact={handleApplyArtifact}
                  />
                )}
                <FindingsList
                  findings={findings}
                  ignoredFindingIds={doc.ignoredFindingIds || []}
                  draftAnswers={draftAnswers}
                  sentAnswers={doc.qa || []}
                  onAnswerChange={handleAnswerChange}
                  onSendAnswer={handleSendAnswer}
                  onIgnoreFinding={handleIgnoreFinding}
                />
              </>
            )}
            {panelView === "history" && <RunHistoryPanel runs={runHistory} />}
          </aside>
        </div>
      </div>

      <PromptPreviewModal
        open={isPromptOpen}
        content={promptPreview}
        onClose={() => setIsPromptOpen(false)}
      />
    </div>
  );
}
