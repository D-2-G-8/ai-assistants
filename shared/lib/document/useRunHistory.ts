"use client";

import { useMemo, useSyncExternalStore } from "react";
import { runStore } from "@/platform/storage/runStore";
import type { RunRecord } from "@/platform/storage/types";

export const useRunHistory = (docId: string | undefined): RunRecord[] => {
  const runSnapshot = useSyncExternalStore(
    runStore.subscribe,
    runStore.getSnapshot,
    runStore.getServerSnapshot
  );

  return useMemo(() => {
    if (!docId) return [];
    return runSnapshot
      .filter((run) => run.documentId === docId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [runSnapshot, docId]);
};
