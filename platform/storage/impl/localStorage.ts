import { createId } from "@/shared/lib/id";
import type {
  DocumentRecord,
  DocType,
  RunRecord,
} from "@/platform/storage/types";

const DOCS_KEY = "ai-assistants-docs-v1";
const RUNS_KEY = "ai-assistants-runs-v1";
const LEGACY_DOCS_KEY = "ba-copilot-docs-v1";
const LEGACY_RUNS_KEY = "ai-assistant-runs-v1";
const DOCS_EVENT = "ai-assistants-docs-change";
const RUNS_EVENT = "ai-assistants-runs-change";

const DEFAULT_DOC_TYPE: DocType = "business";

const EMPTY_CONTENT: DocumentRecord["content"] = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

let cachedDocsRaw: string | null | undefined;
let cachedDocs: DocumentRecord[] = [];
let cachedRunsRaw: string | null | undefined;
let cachedRuns: RunRecord[] = [];

let serverDocs: DocumentRecord[] = [];
let serverRuns: RunRecord[] = [];

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeDocument = (doc: DocumentRecord) => {
  let changed = false;
  const next: DocumentRecord = {
    ...doc,
    docType: doc.docType ?? DEFAULT_DOC_TYPE,
    meta:
      doc.meta && typeof doc.meta === "object" && !Array.isArray(doc.meta)
        ? doc.meta
        : {},
    versionId: doc.versionId || createId(),
    status: doc.status ?? "draft",
    content: doc.content || EMPTY_CONTENT,
    qa: doc.qa ?? [],
    ignoredFindingIds:
      doc.ignoredFindingIds ?? doc.ignoredIssueIds ?? [],
    updatedAt: doc.updatedAt || new Date().toISOString(),
    title: doc.title || "Untitled",
  };

  if (next.docType !== doc.docType) changed = true;
  if (next.meta !== doc.meta) changed = true;
  if (next.versionId !== doc.versionId) changed = true;
  if (next.status !== doc.status) changed = true;
  if (next.content !== doc.content) changed = true;
  if (next.qa !== doc.qa) changed = true;
  if (next.ignoredFindingIds !== doc.ignoredFindingIds) changed = true;
  if (next.updatedAt !== doc.updatedAt) changed = true;
  if (next.title !== doc.title) changed = true;

  return { doc: next, changed };
};

const readDocsRaw = () => {
  const raw = localStorage.getItem(DOCS_KEY);
  if (raw) return raw;
  const legacyRaw = localStorage.getItem(LEGACY_DOCS_KEY);
  if (legacyRaw) {
    localStorage.setItem(DOCS_KEY, legacyRaw);
    return legacyRaw;
  }
  return null;
};

const readRunsRaw = () => {
  const raw = localStorage.getItem(RUNS_KEY);
  if (raw) return raw;
  const legacyRaw = localStorage.getItem(LEGACY_RUNS_KEY);
  if (legacyRaw) {
    localStorage.setItem(RUNS_KEY, legacyRaw);
    return legacyRaw;
  }
  return null;
};

const loadDocs = (): DocumentRecord[] => {
  if (typeof window === "undefined") return serverDocs;
  const data = safeParse<DocumentRecord[]>(readDocsRaw());
  return Array.isArray(data) ? data : [];
};

const saveDocs = (docs: DocumentRecord[]) => {
  if (typeof window === "undefined") {
    serverDocs = docs;
    return;
  }
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(DOCS_EVENT));
};

const loadRuns = (): RunRecord[] => {
  if (typeof window === "undefined") return serverRuns;
  const data = safeParse<RunRecord[]>(readRunsRaw());
  return Array.isArray(data) ? data : [];
};

const saveRuns = (runs: RunRecord[]) => {
  if (typeof window === "undefined") {
    serverRuns = runs;
    return;
  }
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  window.dispatchEvent(new Event(RUNS_EVENT));
};

export const createDocumentStore = () => ({
  list: () => {
    const docs = loadDocs();
    let changed = false;
    const normalized = docs.map((doc) => {
      const result = normalizeDocument(doc);
      if (result.changed) changed = true;
      return result.doc;
    });
    if (changed) saveDocs(normalized);
    return normalized;
  },
  get: (id: string) => {
    const docs = loadDocs();
    const doc = docs.find((item) => item.id === id);
    if (!doc) return null;
    const result = normalizeDocument(doc);
    if (result.changed) {
      const nextDocs = docs.map((item) =>
        item.id === id ? result.doc : item
      );
      saveDocs(nextDocs);
    }
    return result.doc;
  },
  upsert: (doc: DocumentRecord) => {
    const docs = loadDocs();
    const result = normalizeDocument(doc);
    const index = docs.findIndex((item) => item.id === doc.id);
    const nextDocs = [...docs];
    if (index >= 0) {
      nextDocs[index] = result.doc;
    } else {
      nextDocs.push(result.doc);
    }
    saveDocs(nextDocs);
  },
  create: (id: string, overrides: Partial<DocumentRecord> = {}) => {
    const now = new Date().toISOString();
    const doc: DocumentRecord = {
      id,
      title: "Untitled",
      docType: DEFAULT_DOC_TYPE,
      content: JSON.parse(JSON.stringify(EMPTY_CONTENT)) as DocumentRecord["content"],
      meta: {},
      versionId: createId(),
      status: "draft",
      updatedAt: now,
      createdAt: now,
      qa: [],
      ignoredFindingIds: [],
      ...overrides,
    };
    const normalized = normalizeDocument(doc).doc;
    const docs = loadDocs();
    saveDocs([...docs, normalized]);
    return normalized;
  },
  subscribe: (callback: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    const handler = () => callback();
    window.addEventListener(DOCS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(DOCS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
  getSnapshot: () => {
    if (typeof window === "undefined") return cachedDocs;
    const raw = readDocsRaw();
    if (raw === cachedDocsRaw) return cachedDocs;
    cachedDocsRaw = raw;
    const parsed = safeParse<DocumentRecord[]>(raw);
    cachedDocs = Array.isArray(parsed) ? parsed : [];
    return cachedDocs;
  },
  getServerSnapshot: () => serverDocs,
});

export const createRunStore = () => ({
  list: () => loadRuns(),
  listByDocument: (documentId: string) =>
    loadRuns()
      .filter((run) => run.documentId === documentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  get: (id: string) => loadRuns().find((run) => run.id === id) || null,
  add: (run: RunRecord) => {
    const runs = loadRuns();
    saveRuns([...runs, run]);
  },
  clear: () => {
    saveRuns([]);
  },
  subscribe: (callback: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    const handler = () => callback();
    window.addEventListener(RUNS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(RUNS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
  getSnapshot: () => {
    if (typeof window === "undefined") return cachedRuns;
    const raw = readRunsRaw();
    if (raw === cachedRunsRaw) return cachedRuns;
    cachedRunsRaw = raw;
    const parsed = safeParse<RunRecord[]>(raw);
    cachedRuns = Array.isArray(parsed) ? parsed : [];
    return cachedRuns;
  },
  getServerSnapshot: () => serverRuns,
});
