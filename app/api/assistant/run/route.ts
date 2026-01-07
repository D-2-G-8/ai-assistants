import { NextResponse } from "next/server";
import { assistantRunRequestSchema } from "@/platform/assistant-runtime/schema";
import { resolveAssistantProfile } from "@/platform/assistant-runtime/registry";
import { runAssistantPipeline } from "@/platform/assistant-runtime/runPipeline";
import { runStore } from "@/platform/storage/runStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = assistantRunRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  const { document, action, assistantProfileId, inputs, dryRun } =
    parsed.data;

  const profile = resolveAssistantProfile({
    docType: document.docType,
    action,
    assistantProfileId,
  });

  if (!profile) {
    return NextResponse.json(
      { error: "No assistant profile found for this request" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || profile.llm.model;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set" },
      { status: 200 }
    );
  }

  const result = await runAssistantPipeline({
    request: {
      documentId: parsed.data.documentId,
      action,
      assistantProfileId,
      inputs,
      document,
      dryRun,
    },
    profile,
    apiKey,
    model,
    persistRun: dryRun ? undefined : runStore.add,
  });

  const headers = new Headers();
  if (result.run.status === "failed") {
    headers.set("x-run-error", result.run.error || "Assistant run failed");
  }

  const includeDebug = process.env.NODE_ENV === "development";

  return NextResponse.json(
    {
      run: result.run,
      result: result.run.result,
      promptSnapshot: result.promptSnapshot,
      prep: includeDebug ? result.prepResult : undefined,
      outline: includeDebug ? result.outline : undefined,
    },
    { status: 200, headers }
  );
}
