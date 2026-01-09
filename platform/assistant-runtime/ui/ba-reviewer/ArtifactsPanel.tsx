"use client";

import type { Artifact } from "@/platform/artifacts/types";

type ArtifactsPanelProps = {
  artifacts: Artifact[];
  onApplyArtifact: (artifact: Artifact) => void;
};

export default function ArtifactsPanel({
  artifacts,
  onApplyArtifact,
}: ArtifactsPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Artifacts
      </h3>
      {artifacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          No artifacts produced yet.
        </p>
      ) : (
        artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {artifact.type}
                </p>
                <p className="text-[11px] text-slate-500">
                  {artifact.patchType} · {artifact.apply}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onApplyArtifact(artifact)}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
            {artifact.type === "blocks" && (
              <p className="text-xs text-slate-500">
                {artifact.blocks.length} blocks ready to insert.
              </p>
            )}
            {artifact.type === "doc_patch" && (
              <p className="text-xs text-slate-500">
                {artifact.patch.length} patch operations.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
