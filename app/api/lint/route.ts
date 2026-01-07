import { NextResponse } from "next/server";
import { lintRequestSchema } from "@/shared/lib/schemas";
import { resolveAssistantProfile } from "@/platform/assistant-runtime/registry";
import { runAssistantPipeline } from "@/platform/assistant-runtime/runPipeline";
import type { Finding } from "@/platform/artifacts/types";
import type { Issue, Question } from "@/shared/lib/schemas";
import { createId } from "@/shared/lib/id";
import { runStore } from "@/platform/storage/runStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const headers = new Headers();

  if (!apiKey) {
    headers.set("x-lint-error", "OPENROUTER_API_KEY is not set");
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  const body = await request.json().catch(() => null);
  const parsedRequest = lintRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    headers.set("x-lint-error", "Invalid request payload");
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  const { title, content, contentJson, qaContext, dryRun } =
    parsedRequest.data;
  const includeSanitized = process.env.NODE_ENV === "development";

  const profile = resolveAssistantProfile({
    docType: "business",
    action: "lint",
  });

  if (!profile) {
    headers.set("x-lint-error", "No assistant profile found for lint");
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  const result = await runAssistantPipeline({
    request: {
      documentId: createId(),
      action: "lint",
      document: {
        title,
        docType: "business",
        content:
          contentJson && typeof contentJson === "object"
            ? (contentJson as Record<string, unknown>)
            : { type: "doc", content: [] },
        contentText: content || "",
        meta: {},
        versionId: createId(),
      },
      inputs: qaContext ? { qaContext } : undefined,
      dryRun,
    },
    profile,
    apiKey,
    model,
    persistRun: dryRun ? undefined : runStore.add,
  });

  if (dryRun) {
    const fullPrompt = `${result.promptSnapshot.system}\n\n${result.promptSnapshot.user}`;
    return NextResponse.json(
      {
        userPrompt: result.promptSnapshot.user,
        fullPrompt,
        prep: result.prepResult,
        outline: result.outline,
      },
      { status: 200, headers }
    );
  }

  if (result.run.status === "failed") {
    headers.set(
      "x-lint-error",
      result.run.error || "Assistant run failed"
    );
  }

  const findings = result.run.result?.findings ?? [];

  const toIssueSeverity = (severity: Finding["severity"]): Issue["severity"] => {
    if (severity === "error") return "blocker";
    if (severity === "warn") return "warning";
    return "suggestion";
  };

  const toQuestionSeverity = (
    severity: Finding["severity"]
  ): Question["severity"] => {
    if (severity === "error") return "blocker";
    return "warning";
  };

  const issues: Issue[] = findings
    .filter((finding) => finding.kind !== "question")
    .map((finding) => ({
      id: finding.id,
      severity: toIssueSeverity(finding.severity),
      category: (finding.category as Issue["category"]) || "missing",
      quote: finding.anchor?.quote ?? null,
      message: finding.message,
      fix_suggestion: finding.suggestion || "",
      startHint: finding.anchor?.startHint ?? null,
      endHint: finding.anchor?.endHint ?? null,
      question: null,
    }));

  const questions: Question[] = findings
    .filter((finding) => finding.kind === "question")
    .map((finding) => ({
      id: finding.id,
      severity: toQuestionSeverity(finding.severity),
      question: finding.message,
      reason: finding.suggestion || "",
    }));

  const safeResponse = {
    issues: issues.slice(0, 12),
    questions: questions.slice(0, 8),
  };

  const responseBody = includeSanitized
    ? { ...safeResponse, prep: result.prepResult }
    : safeResponse;

  return NextResponse.json(responseBody, { status: 200, headers });
}
