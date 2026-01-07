import type { DocumentRecord } from "@/platform/storage/types";
import { createDocumentStore } from "@/platform/storage/impl/localStorage";

export type DocumentStore = {
  list: () => DocumentRecord[];
  get: (id: string) => DocumentRecord | null;
  upsert: (doc: DocumentRecord) => void;
  create: (id: string, overrides?: Partial<DocumentRecord>) => DocumentRecord;
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => DocumentRecord[];
  getServerSnapshot: () => DocumentRecord[];
};

export const documentStore: DocumentStore = createDocumentStore();
