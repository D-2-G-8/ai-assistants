export type DocStatus = "draft" | "ready";

export type QaEntry = {
  id: string;
  question: string;
  answer: string;
};

export type DocRecord = {
  id: string;
  title: string;
  status: DocStatus;
  content: Record<string, unknown>;
  updatedAt: string;
  lastCheckedAt?: string;
  lastCheckedBy?: string;
  qa?: QaEntry[];
  ignoredIssueIds?: string[];
};

const STORAGE_KEY = "ba-copilot-docs-v1";
const DOCS_EVENT = "ba-copilot-docs-change";
let cachedRaw: string | null | undefined;
let cachedDocs: DocRecord[] = [];

const EMPTY_CONTENT: DocRecord["content"] = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const safeParse = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocRecord[];
  } catch {
    return null;
  }
};

export const loadDocs = (): DocRecord[] => {
  if (typeof window === "undefined") return [];
  const data = safeParse(localStorage.getItem(STORAGE_KEY));
  return Array.isArray(data) ? data : [];
};

export const saveDocs = (docs: DocRecord[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(DOCS_EVENT));
};

export const getDoc = (id: string): DocRecord | null => {
  const docs = loadDocs();
  return docs.find((doc) => doc.id === id) || null;
};

export const upsertDoc = (doc: DocRecord) => {
  const docs = loadDocs();
  const index = docs.findIndex((item) => item.id === doc.id);
  if (index >= 0) {
    docs[index] = doc;
  } else {
    docs.push(doc);
  }
  saveDocs(docs);
};

export const createDoc = (id: string, title = "Untitled") => {
  const now = new Date().toISOString();
  const doc: DocRecord = {
    id,
    title,
    status: "draft",
    content: JSON.parse(JSON.stringify(EMPTY_CONTENT)) as DocRecord["content"],
    updatedAt: now,
    qa: [],
    ignoredIssueIds: [],
  };
  upsertDoc(doc);
  return doc;
};

export const subscribeDocs = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback();
  window.addEventListener(DOCS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DOCS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
};

export const getDocsSnapshot = () => {
  if (typeof window === "undefined") return cachedDocs;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedDocs;
  cachedRaw = raw;
  const parsed = safeParse(raw);
  cachedDocs = Array.isArray(parsed) ? parsed : [];
  return cachedDocs;
};

const EMPTY_DOCS: DocRecord[] = [];

export const getDocsServerSnapshot = () => EMPTY_DOCS;

export const updateDocMeta = (id: string, updates: Partial<DocRecord>) => {
  const existing = getDoc(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  upsertDoc(updated);
  return updated;
};
