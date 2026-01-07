import { NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { lintRequestSchema, lintResponseSchema } from "@/lib/schemas";
import { buildLintPromptParts } from "@/lib/lint-prompt";
import { tiptapToMarkdown } from "@/lib/text-prep/tiptapToMarkdown";
import { SYSTEM_PROMPT } from "@/lib/lint-constants";

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
  const resolvedContent =
    contentJson && typeof contentJson === "object"
      ? tiptapToMarkdown(contentJson as Record<string, unknown>) || content || ""
      : content || "";
  const promptParts = buildLintPromptParts({
    title,
    content: resolvedContent,
    qaContext,
  });

  const userPrompt = promptParts.userPrompt;

  if (dryRun) {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
    const responseBody = {
      userPrompt,
      fullPrompt,
      prep: promptParts.prepResult,
      outline: promptParts.outline,
    };
    return NextResponse.json(responseBody, { status: 200, headers });
  }

  let rawResponse: string;
  try {
    rawResponse = await callOpenRouter({
      apiKey,
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (error) {
    headers.set("x-lint-error", (error as Error).message);
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  let jsonResponse: unknown;
  try {
    jsonResponse = JSON.parse(rawResponse);
  } catch (error) {
    headers.set(
      "x-lint-error",
      `Failed to parse JSON: ${(error as Error).message}`
    );
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  const parsedResponse = lintResponseSchema.safeParse(jsonResponse);
  if (!parsedResponse.success) {
    headers.set("x-lint-error", "Model response did not match schema");
    return NextResponse.json(
      { issues: [], questions: [] },
      { status: 200, headers }
    );
  }

  const safeResponse = {
    issues: parsedResponse.data.issues.slice(0, 12),
    questions: parsedResponse.data.questions.slice(0, 8),
  };

  const responseBody = includeSanitized
    ? { ...safeResponse, prep: promptParts.prepResult }
    : safeResponse;

  return NextResponse.json(responseBody, { status: 200, headers });
}
