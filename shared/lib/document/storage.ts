import { documentStore } from "@/platform/storage/documentStore";
import type {
  DocumentRecord,
  DocStatus as DocumentStatus,
  QaEntry as QaEntryType,
} from "@/platform/storage/types";

export type DocStatus = DocumentStatus;
export type QaEntry = QaEntryType;
export type DocRecord = DocumentRecord;

export const loadDocs = () => documentStore.list();
export const saveDocs = (docs: DocumentRecord[]) => {
  docs.forEach((doc) => documentStore.upsert(doc));
};

export const getDoc = (id: string) => documentStore.get(id);

export const upsertDoc = (doc: DocumentRecord) => {
  documentStore.upsert(doc);
};

export const createDoc = (id: string, title = "Untitled") =>
  documentStore.create(id, { title });

export const subscribeDocs = documentStore.subscribe;
export const getDocsSnapshot = documentStore.getSnapshot;
export const getDocsServerSnapshot = documentStore.getServerSnapshot;

export const updateDocMeta = (id: string, updates: Partial<DocumentRecord>) => {
  const existing = documentStore.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  documentStore.upsert(updated);
  return updated;
};
