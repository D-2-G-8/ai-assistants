"use client";

import { useMemo, useState } from "react";
import { prepareText } from "@/lib/text-prep";
import SanitizePreview from "@/components/SanitizePreview";

export default function SanitizeDev() {
  const [input, setInput] = useState("");

  const prepared = useMemo(() => prepareText(input), [input]);

  return (
    <SanitizePreview
      input={input}
      prepared={prepared}
      onInputChange={setInput}
      header={
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Dev Tools
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Sanitize preview
          </h1>
          <p className="text-sm text-slate-500">
            Paste raw BA doc content and inspect the deterministic sanitization
            output before linting.
          </p>
        </header>
      }
    />
  );
}
