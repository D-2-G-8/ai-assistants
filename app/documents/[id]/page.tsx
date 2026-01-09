"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ReviewerEditor from "@/platform/assistant-runtime/ui/ba-reviewer/ReviewerEditor";
import WriterEditor from "@/platform/assistant-runtime/ui/ba-writer/WriterEditor";
import { documentStore } from "@/platform/storage/documentStore";
import { resolveWorkflowStage } from "@/shared/lib/document/workflow";
import type { DocumentRecord } from "@/platform/storage/types";
import AssistantSwitch from "@/shared/components/document/AssistantSwitch";

type AssistantMode = "writer" | "reviewer";

const isAssistantMode = (value: string | null): value is AssistantMode =>
  value === "writer" || value === "reviewer";

const resolveDefaultAssistant = (doc: DocumentRecord | null): AssistantMode => {
  if (!doc) return "writer";
  const stage = resolveWorkflowStage(doc);
  return stage === "review" || stage === "ready" ? "reviewer" : "writer";
};

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = typeof params.id === "string" ? params.id : params.id?.[0];

  const docs = useSyncExternalStore(
    documentStore.subscribe,
    documentStore.getSnapshot,
    documentStore.getServerSnapshot
  );

  const doc = useMemo(() => {
    if (!docId) return null;
    return docs.find((item) => item.id === docId) ?? null;
  }, [docs, docId]);

  const assistantParam = searchParams.get("assistant");
  const assistant: AssistantMode = isAssistantMode(assistantParam)
    ? assistantParam
    : resolveDefaultAssistant(doc);

  const setAssistant = (mode: AssistantMode) => {
    if (!docId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("assistant", mode);
    router.replace(`/documents/${docId}?${next.toString()}`);
  };

  if (!docId) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-slate-600">
        Loading...
      </div>
    );
  }

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
    <>
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2 py-2 shadow-sm backdrop-blur">
        <span className="pl-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Assistant
        </span>
        <AssistantSwitch
          active={assistant === "writer"}
          label="BA-writer"
          onClick={() => setAssistant("writer")}
        />
        <AssistantSwitch
          active={assistant === "reviewer"}
          label="BA-reviewer"
          onClick={() => setAssistant("reviewer")}
        />
      </div>
      {assistant === "writer" ? (
        <WriterEditor docId={docId} />
      ) : (
        <ReviewerEditor docId={docId} />
      )}
    </>
  );
}
