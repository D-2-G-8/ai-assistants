"use client";

import { useState } from "react";
import WriterAssistantPanel from "@/platform/assistant-runtime/ui/ba-writer/WriterAssistantPanel";
import { useRouter } from "next/navigation";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { documentStore } from "@/platform/storage/documentStore";
import { runStore } from "@/platform/storage/runStore";
import type { DocumentRecord, RunRecord } from "@/platform/storage/types";
import { createId } from "@/shared/lib/utils/id";
import {
  runBaWriter,
  BaWriterClientError,
} from "@/shared/lib/ba-writer/client";
import RunHistoryPanel from "@/shared/components/assistant-runtime/RunHistoryPanel";
import Editor from "@/platform/editor/tiptap/Editor";
import DocumentEditorLayout from "@/shared/components/document/DocumentEditorLayout";
import WriterTopBar from "@/platform/assistant-runtime/ui/ba-writer/WriterTopBar";
import { useRunHistory } from "@/shared/lib/document/useRunHistory";
import { resolveWorkflowStage } from "@/shared/lib/document/workflow";
import type {
  BaWriterBlock,
  BaWriterMissingInfo,
  BaWriterSuggestion,
} from "@/shared/lib/ba-writer/types";
import SuggestionBlockNode from "@/shared/lib/ba-writer/tiptap/SuggestionBlockNode";
import SuggestionMark from "@/shared/lib/ba-writer/tiptap/SuggestionMark";
import {
  acceptAllSuggestions,
  acceptSuggestion,
  rejectAllSuggestions,
  rejectSuggestion,
} from "@/shared/lib/ba-writer/tiptap/commands";
import {
  listSuggestions,
  type SuggestionEntry,
} from "@/shared/lib/ba-writer/tiptap/utils";
import {
  BA_WRITER_PROFILE_ID,
  BA_WRITER_PROFILE_VERSION_ID,
} from "@/platform/assistant-runtime/ui/ba-writer/modules/constants";
import {
  applyWorkflowStage,
  applyWriterOutput,
  blockToTiptapNode,
  buildNotesFromDoc,
  getSectionInsertPosition,
} from "@/platform/assistant-runtime/ui/ba-writer/modules/helpers";

type WriterEditorContentProps = {
  doc: DocumentRecord;
  onDocChange: (doc: DocumentRecord) => void;
};

export default function WriterEditorContent({
  doc,
  onDocChange,
}: WriterEditorContentProps) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [docText, setDocText] = useState("");
  const [notes, setNotes] = useState("");
  const [missingInfo, setMissingInfo] = useState<BaWriterMissingInfo[]>([]);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [selectionText, setSelectionText] = useState("");
  const [panelView, setPanelView] = useState<"assistant" | "history" | "none">(
    "assistant"
  );
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const runHistory = useRunHistory(doc.id);

  const handleEditorReady = (instance: TiptapEditor) => {
    setEditor(instance);
    setDocText(instance.getText());
    setSuggestions(listSuggestions(instance.state.doc));
  };

  const handleEditorUpdate = (content: Record<string, unknown>, text: string) => {
    const staged = applyWorkflowStage(doc, "drafting");
    const updated: DocumentRecord = {
      ...staged,
      content,
      versionId: createId(),
      updatedAt: new Date().toISOString(),
      status: staged.status === "ready" ? "draft" : staged.status,
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDocText(text);
    setDirty(true);
    if (editor) {
      setSuggestions(listSuggestions(editor.state.doc));
    }
  };

  const handleTitleChange = (value: string) => {
    const staged = applyWorkflowStage(doc, "drafting");
    const updated: DocumentRecord = {
      ...staged,
      title: value,
      updatedAt: new Date().toISOString(),
      status: staged.status === "ready" ? "draft" : staged.status,
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDirty(true);
  };

  const handleSendToReview = () => {
    const staged = applyWorkflowStage(doc, "review");
    const updated: DocumentRecord = {
      ...staged,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    onDocChange(updated);
    documentStore.upsert(updated);
    setDirty(false);
    router.push(`/documents/${doc.id}`);
  };

  const handleGenerate = async () => {
    if (!editor) return;
    const trimmedNotes = notes.trim();
    const fallbackNotes = trimmedNotes || docText.trim();
    if (!fallbackNotes) {
      setAssistantError("Notes must be provided before running BA-writer.");
      return;
    }

    const runStartedAt = new Date().toISOString();
    const runId = createId();
    const inputVersionId = doc.versionId;

    setIsGenerating(true);
    setAssistantError(null);

    try {
      const result = await runBaWriter({
        notes: fallbackNotes,
        title: doc.title,
      });
      applyWriterOutput(editor, result);
      setMissingInfo(result.missingInfo);
      if (!trimmedNotes) {
        setNotes(fallbackNotes);
      }
      const runRecord: RunRecord = {
        id: runId,
        documentId: doc.id,
        inputDocumentVersionId: inputVersionId,
        assistantProfileId: BA_WRITER_PROFILE_ID,
        assistantProfileVersionId: BA_WRITER_PROFILE_VERSION_ID,
        action: "generate",
        status: "succeeded",
        createdAt: runStartedAt,
        updatedAt: new Date().toISOString(),
      };
      runStore.add(runRecord);
    } catch (error) {
      const message =
        error instanceof BaWriterClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "BA-writer request failed.";
      setAssistantError(message);
      const runRecord: RunRecord = {
        id: runId,
        documentId: doc.id,
        inputDocumentVersionId: inputVersionId,
        assistantProfileId: BA_WRITER_PROFILE_ID,
        assistantProfileVersionId: BA_WRITER_PROFILE_VERSION_ID,
        action: "generate",
        status: "failed",
        error: message,
        createdAt: runStartedAt,
        updatedAt: new Date().toISOString(),
      };
      runStore.add(runRecord);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptSuggestion = (id: string) => {
    if (!editor) return;
    const tr = acceptSuggestion(editor.state, id);
    if (tr) {
      editor.view.dispatch(tr);
    }
  };

  const handleRejectSuggestion = (id: string) => {
    if (!editor) return;
    const tr = rejectSuggestion(editor.state, id);
    if (tr) {
      editor.view.dispatch(tr);
    }
  };

  const handleAcceptAll = () => {
    if (!editor) return;
    const tr = acceptAllSuggestions(editor.state);
    if (tr) {
      editor.view.dispatch(tr);
    }
  };

  const handleRejectAll = () => {
    if (!editor) return;
    const tr = rejectAllSuggestions(editor.state);
    if (tr) {
      editor.view.dispatch(tr);
    }
  };

  const insertTodo = (item: BaWriterMissingInfo) => {
    if (!editor) return;
    const suggestionId = createId();
    const suggestion: BaWriterSuggestion = {
      id: suggestionId,
      kind: "question",
      reason: item.question,
      confidence: null,
    };
    const block: BaWriterBlock = {
      type: "paragraph",
      sectionId: item.sectionId,
      text: `TODO: ${item.question}`,
      origin: "ai",
      suggestionId,
    };
    const node = blockToTiptapNode(block, new Map([[suggestionId, suggestion]]));
    if (!node) return;
    const insertPos = getSectionInsertPosition(editor.state.doc, item.sectionId);
    editor.commands.insertContentAt(insertPos, [node]);
  };

  const stage = resolveWorkflowStage(doc);
  const handleUseFullDoc = () => {
    const content = editor
      ? (editor.getJSON() as Record<string, unknown>)
      : doc.content;
    const fallback = editor?.getText() ?? docText;
    setNotes(buildNotesFromDoc(doc, content, fallback));
  };
  const handleUseSelection = () => {
    if (!selectionText) return;
    setNotes(selectionText);
  };

  return (
    <DocumentEditorLayout
      doc={doc}
      onTitleChange={handleTitleChange}
      errorMessage={assistantError}
      errorLabel="BA-writer error"
      topBar={
        <WriterTopBar
          stage={stage}
          dirty={dirty}
          panelView={panelView}
          onSendToReview={handleSendToReview}
          onToggleAssistantPanel={() =>
            setPanelView((prev) => (prev === "assistant" ? "none" : "assistant"))
          }
          onToggleHistoryPanel={() =>
            setPanelView((prev) => (prev === "history" ? "none" : "history"))
          }
        />
      }
      panelView={panelView}
      editor={
        <Editor
          content={doc.content}
          findings={[]}
          ignoredFindingIds={[]}
          onUpdate={handleEditorUpdate}
          onEditorReady={handleEditorReady}
          onSelectionTextChange={setSelectionText}
          placeholder="Start shaping your BA document..."
          extensions={[SuggestionBlockNode, SuggestionMark]}
        />
      }
      assistantPanel={
        <WriterAssistantPanel
          notes={notes}
          onNotesChange={setNotes}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          onUseFullDoc={handleUseFullDoc}
          selectionText={selectionText}
          onUseSelection={handleUseSelection}
          suggestions={suggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          missingInfo={missingInfo}
          onInsertTodo={insertTodo}
        />
      }
      historyPanel={<RunHistoryPanel runs={runHistory} />}
    />
  );
}
