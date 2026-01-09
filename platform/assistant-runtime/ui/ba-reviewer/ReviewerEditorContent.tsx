"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/platform/editor/tiptap/Editor";
import RunHistoryPanel from "@/shared/components/assistant-runtime/RunHistoryPanel";
import PromptPreviewModal from "@/platform/assistant-runtime/ui/ba-reviewer/PromptPreviewModal";
import ReviewerTopBar from "@/platform/assistant-runtime/ui/ba-reviewer/ReviewerTopBar";
import ReviewerAssistantPanel from "@/platform/assistant-runtime/ui/ba-reviewer/ReviewerAssistantPanel";
import DocumentEditorLayout from "@/shared/components/document/DocumentEditorLayout";
import { documentStore } from "@/platform/storage/documentStore";
import { runStore } from "@/platform/storage/runStore";
import { resolveAssistantProfile } from "@/platform/assistant-runtime/registry";
import { applyArtifactToContent } from "@/platform/artifacts/apply";
import { createId } from "@/shared/lib/utils/id";
import { useRunHistory } from "@/shared/lib/document/useRunHistory";
import {
  DEFAULT_ACTION,
  DEFAULT_PANEL_VIEW,
  type PanelView,
} from "@/shared/lib/ba-reviewer/constants";
import {
  filterEffectiveFindings,
  countFindingsBySeverity,
} from "@/shared/lib/ba-reviewer/findings";
import {
  buildDraftAnswers,
  mergeDraftAnswersFromFindings,
  upsertQaEntry,
} from "@/shared/lib/ba-reviewer/qa";
import type { Artifact, Finding } from "@/platform/artifacts/types";
import type {
  AssistantAction,
  DocumentRecord,
  RunRecord,
} from "@/platform/storage/types";

type ReviewerEditorContentProps = {
  doc: DocumentRecord;
  onDocChange: (doc: DocumentRecord) => void;
};

export default function ReviewerEditorContent({
  doc,
  onDocChange,
}: ReviewerEditorContentProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [needsRerun, setNeedsRerun] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [docText, setDocText] = useState<string>("");
  const [panelView, setPanelView] = useState<PanelView>(DEFAULT_PANEL_VIEW);
  const [promptPreview, setPromptPreview] = useState<string>("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [action, setAction] = useState<AssistantAction>(DEFAULT_ACTION);
  const [panelInputs, setPanelInputs] = useState<Record<string, string>>({});
  const [editorResetKey, setEditorResetKey] = useState(0);

  const runHistory = useRunHistory(doc.id);

  const lastDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!doc.id) return;
    if (lastDocIdRef.current === doc.id) return;
    lastDocIdRef.current = doc.id;
    setFindings([]);
    setArtifacts([]);
    setNeedsRerun(false);
    setDirty(false);
    setAssistantError(null);
    setPromptPreview("");
    setIsPromptOpen(false);
    setDraftAnswers(buildDraftAnswers(doc));
  }, [doc]);

  useEffect(() => {
    if (!findings.length) return;
    setDraftAnswers((prev) =>
      mergeDraftAnswersFromFindings(prev, findings, doc)
    );
  }, [findings, doc]);

  const effectiveFindings = useMemo(
    () => filterEffectiveFindings(doc, findings),
    [doc, findings]
  );

  const { blockerCount, warningCount, suggestionCount } =
    countFindingsBySeverity(effectiveFindings);

  const profile = useMemo(() => {
    return resolveAssistantProfile({
      docType: doc.docType,
      action,
    });
  }, [doc, action]);

  const handleEditorUpdate = (content: Record<string, unknown>, text: string) => {
    const updated: DocumentRecord = {
      ...doc,
      content,
      versionId: createId(),
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDocText(text);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleTitleChange = (value: string) => {
    const updated: DocumentRecord = {
      ...doc,
      title: value,
      updatedAt: new Date().toISOString(),
      status: doc.status === "ready" ? "draft" : doc.status,
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDirty(true);
    setNeedsRerun(true);
  };

  const handleRun = async () => {
    if (!profile) return;
    setIsRunning(true);
    setAssistantError(null);

    try {
      const response = await fetch("/api/ba-reviewer", {
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

      onDocChange(updated);
      documentStore.upsert(updated);
    } catch (error) {
      setAssistantError((error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePreviewPrompt = async () => {
    if (!profile) return;
    setIsPreviewing(true);
    setAssistantError(null);

    try {
      const response = await fetch("/api/ba-reviewer", {
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
    if (blockerCount > 0) return;
    const updated: DocumentRecord = {
      ...doc,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDirty(false);
  };

  const handleAnswerChange = (id: string, value: string) => {
    setDraftAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSendAnswer = (id: string) => {
    const question = findings.find((item) => item.id === id);
    if (!question) return;
    const answer = (draftAnswers[id] || "").trim();
    if (!answer) return;

    const updatedQa = upsertQaEntry(doc.qa, question, answer);

    const updated: DocumentRecord = {
      ...doc,
      qa: updatedQa,
      updatedAt: new Date().toISOString(),
    };

    onDocChange(updated);
    documentStore.upsert(updated);
    setNeedsRerun(true);
  };

  const handleIgnoreFinding = (id: string) => {
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
    onDocChange(updated);
    documentStore.upsert(updated);
  };

  const handleApplyArtifact = (artifact: Artifact) => {
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

    onDocChange(updated);
    documentStore.upsert(updated);
    setDirty(true);
    setNeedsRerun(true);
    setEditorResetKey((prev) => prev + 1);
  };

  return (
    <>
      <DocumentEditorLayout
        doc={doc}
        onTitleChange={handleTitleChange}
        errorMessage={assistantError}
        topBar={
          <ReviewerTopBar
            status={doc.status}
            dirty={dirty}
            panelView={panelView}
            saveDisabled={blockerCount > 0}
            onSaveReady={handleSaveReady}
            onToggleAssistantPanel={() =>
              setPanelView((prev) =>
                prev === "assistant" ? "none" : "assistant"
              )
            }
            onToggleHistoryPanel={() =>
              setPanelView((prev) => (prev === "history" ? "none" : "history"))
            }
          />
        }
        panelView={panelView}
        editor={
          <Editor
            key={`${doc.id}-${editorResetKey}`}
            content={doc.content}
            findings={effectiveFindings}
            ignoredFindingIds={doc.ignoredFindingIds || []}
            onUpdate={handleEditorUpdate}
            onReady={(text) => setDocText(text)}
          />
        }
        assistantPanel={
          <ReviewerAssistantPanel
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
            blockerCount={blockerCount}
            warningCount={warningCount}
            suggestionCount={suggestionCount}
            lastCheckedAt={doc.lastCheckedAt}
            artifacts={artifacts}
            onApplyArtifact={handleApplyArtifact}
            findings={findings}
            ignoredFindingIds={doc.ignoredFindingIds || []}
            draftAnswers={draftAnswers}
            sentAnswers={doc.qa || []}
            onAnswerChange={handleAnswerChange}
            onSendAnswer={handleSendAnswer}
            onIgnoreFinding={handleIgnoreFinding}
          />
        }
        historyPanel={<RunHistoryPanel runs={runHistory} />}
      />

      <PromptPreviewModal
        open={isPromptOpen}
        content={promptPreview}
        onClose={() => setIsPromptOpen(false)}
      />
    </>
  );
}
