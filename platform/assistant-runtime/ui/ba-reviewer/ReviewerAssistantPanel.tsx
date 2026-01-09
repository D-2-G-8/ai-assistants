"use client";

import RunAssistantPanel from "@/platform/assistant-runtime/ui/ba-reviewer/RunAssistantPanel";
import AssistantSummary from "@/platform/assistant-runtime/ui/ba-reviewer/AssistantSummary";
import ArtifactsPanel from "@/platform/assistant-runtime/ui/ba-reviewer/ArtifactsPanel";
import FindingsList from "@/platform/assistant-runtime/ui/ba-reviewer/FindingsList";
import type { AssistantProfile } from "@/platform/assistant-runtime/types";
import type { Artifact, Finding } from "@/platform/artifacts/types";
import type { AssistantAction, QaEntry } from "@/platform/storage/types";

type ReviewerAssistantPanelProps = {
  profile: AssistantProfile | null;
  action: AssistantAction;
  onActionChange: (action: AssistantAction) => void;
  inputs: Record<string, string>;
  onInputsChange: (inputs: Record<string, string>) => void;
  isRunning: boolean;
  isPreviewing: boolean;
  hasRun: boolean;
  needsRerun: boolean;
  onRun: () => void;
  onPreviewPrompt: () => void;
  blockerCount: number;
  warningCount: number;
  suggestionCount: number;
  lastCheckedAt?: string;
  artifacts: Artifact[];
  onApplyArtifact: (artifact: Artifact) => void;
  findings: Finding[];
  ignoredFindingIds: string[];
  draftAnswers: Record<string, string>;
  sentAnswers: QaEntry[];
  onAnswerChange: (id: string, value: string) => void;
  onSendAnswer: (id: string) => void;
  onIgnoreFinding: (id: string) => void;
};

export default function ReviewerAssistantPanel({
  profile,
  action,
  onActionChange,
  inputs,
  onInputsChange,
  isRunning,
  isPreviewing,
  hasRun,
  needsRerun,
  onRun,
  onPreviewPrompt,
  blockerCount,
  warningCount,
  suggestionCount,
  lastCheckedAt,
  artifacts,
  onApplyArtifact,
  findings,
  ignoredFindingIds,
  draftAnswers,
  sentAnswers,
  onAnswerChange,
  onSendAnswer,
  onIgnoreFinding,
}: ReviewerAssistantPanelProps) {
  return (
    <>
      {profile && (
        <RunAssistantPanel
          profile={profile}
          action={action}
          onActionChange={onActionChange}
          inputs={inputs}
          onInputsChange={onInputsChange}
          isRunning={isRunning}
          isPreviewing={isPreviewing}
          hasRun={hasRun}
          needsRerun={needsRerun}
          onRun={onRun}
          onPreviewPrompt={onPreviewPrompt}
        />
      )}
      <AssistantSummary
        blockerCount={blockerCount}
        warningCount={warningCount}
        suggestionCount={suggestionCount}
        lastCheckedAt={lastCheckedAt}
      />
      {(action !== "lint" || artifacts.length > 0) && (
        <ArtifactsPanel artifacts={artifacts} onApplyArtifact={onApplyArtifact} />
      )}
      <FindingsList
        findings={findings}
        ignoredFindingIds={ignoredFindingIds}
        draftAnswers={draftAnswers}
        sentAnswers={sentAnswers}
        onAnswerChange={onAnswerChange}
        onSendAnswer={onSendAnswer}
        onIgnoreFinding={onIgnoreFinding}
      />
    </>
  );
}
