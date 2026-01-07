"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  createDoc,
  getDocsServerSnapshot,
  getDocsSnapshot,
  subscribeDocs,
} from "@/lib/storage";

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

export default function Home() {
  const router = useRouter();
  const docs = useSyncExternalStore(
    subscribeDocs,
    getDocsSnapshot,
    getDocsServerSnapshot
  );

  const sortedDocs = useMemo(() => {
    return [...docs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [docs]);

  const lastDoc = sortedDocs[0];

  const handleCreate = () => {
    const id = crypto.randomUUID();
    createDoc(id, "New Product Doc");
    router.push(`/doc/${id}`);
  };

  const handleOpenLast = () => {
    if (!lastDoc) return;
    router.push(`/doc/${lastDoc.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f1e5] via-[#eef9ff] to-[#f8f4ec] px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            BA Copilot
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Draft docs like a Confluence page, linted by AI.
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Create documents, highlight gaps, and keep your BA review loop tight.
            Everything runs locally with OpenRouter powering the checks.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create new
            </button>
            <button
              type="button"
              onClick={handleOpenLast}
              disabled={!lastDoc}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open last
            </button>
          </div>
        </header>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent documents
            </h2>
            <span className="text-xs text-slate-500">
              Stored locally in your browser
            </span>
          </div>
          {sortedDocs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
              No docs yet. Create your first BA document to get started.
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => router.push(`/doc/${doc.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-left transition hover:border-slate-400"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Updated {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {doc.status === "ready" ? "Ready" : "Draft"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
