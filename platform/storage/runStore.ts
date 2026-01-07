import type { RunRecord } from "@/platform/storage/types";
import { createRunStore } from "@/platform/storage/impl/localStorage";

export type RunStore = {
  list: () => RunRecord[];
  listByDocument: (documentId: string) => RunRecord[];
  get: (id: string) => RunRecord | null;
  add: (run: RunRecord) => void;
  clear: () => void;
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => RunRecord[];
  getServerSnapshot: () => RunRecord[];
};

export const runStore: RunStore = createRunStore();
