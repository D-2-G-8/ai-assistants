"use client";

import { useEffect, useState } from "react";
import { documentStore } from "@/platform/storage/documentStore";
import type { DocumentRecord } from "@/platform/storage/types";

export const useDocumentRecord = (
  docId: string | undefined,
  defaultTitle = "New Product Doc"
) => {
  const [doc, setDoc] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    if (!docId) return;
    const existing =
      documentStore.get(docId) ||
      documentStore.create(docId, { title: defaultTitle });
    setDoc(existing);
  }, [docId, defaultTitle]);

  return { doc, setDoc };
};
