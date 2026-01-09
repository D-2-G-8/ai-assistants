"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";
import DocumentHeader from "@/shared/components/document/DocumentHeader";
import type { DocumentRecord } from "@/platform/storage/types";

type PanelView = "assistant" | "history" | "none";

type DocumentEditorLayoutProps = {
  doc: DocumentRecord;
  topBar?: ReactNode;
  editor: ReactNode;
  panelView: PanelView;
  assistantPanel?: ReactNode;
  historyPanel?: ReactNode;
  onTitleChange: (value: string) => void;
  errorMessage?: string | null;
  errorLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  backgroundClassName?: string;
};

export default function DocumentEditorLayout({
  doc,
  topBar,
  editor,
  panelView,
  assistantPanel,
  historyPanel,
  onTitleChange,
  errorMessage,
  errorLabel,
  onBack,
  backLabel = "Back to documents",
  backgroundClassName,
}: DocumentEditorLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/"));

  return (
    <div
      className={clsx(
        "min-h-screen bg-gradient-to-br from-[#f8f3ea] via-[#f0f9ff] to-[#f7f4ec]",
        backgroundClassName
      )}
    >
      {topBar}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400"
        >
          {backLabel}
        </button>

        <DocumentHeader
          doc={doc}
          onTitleChange={onTitleChange}
          errorMessage={errorMessage}
          errorLabel={errorLabel}
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">{editor}</div>

          <aside
            className={clsx(
              "flex w-full flex-col gap-4 lg:w-[360px]",
              panelView === "none" && "hidden"
            )}
          >
            {panelView === "assistant" && assistantPanel}
            {panelView === "history" && historyPanel}
          </aside>
        </div>
      </div>
    </div>
  );
}
