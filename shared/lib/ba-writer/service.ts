import { callOpenRouter } from "@/shared/lib/ai/openrouter";
import { BA_WRITER_SYSTEM_PROMPT } from "./prompt";
import { baWriterSchema } from "./schema";
import type { BaWriterInput, BaWriterOutput } from "./types";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.1;

export type BaWriterErrorCode =
  | "invalid_json"
  | "schema_validation_failed"
  | "llm_error"
  | "missing_api_key";

export class BaWriterError extends Error {
  code: BaWriterErrorCode;
  cause?: unknown;

  constructor(code: BaWriterErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "BaWriterError";
    this.code = code;
    this.cause = cause;
  }
}

const buildUserPrompt = (input: BaWriterInput) => {
  const sections: string[] = [];

  if (input.title) {
    sections.push(`Title: ${input.title}`);
  }

  if (input.docMeta?.version || input.docMeta?.status) {
    const metaParts: string[] = [];
    if (input.docMeta.version) {
      metaParts.push(`version=${input.docMeta.version}`);
    }
    if (input.docMeta.status) {
      metaParts.push(`status=${input.docMeta.status}`);
    }
    sections.push(`Doc meta: ${metaParts.join(", ")}`);
  }

  sections.push(`Notes:\n${input.notes}`);

  return sections.join("\n\n");
};

const shouldLogParseFailures = process.env.NODE_ENV !== "production";

const logParseFailure = (
  code: "invalid_json" | "schema_validation_failed",
  rawText: string,
  detail: unknown
) => {
  if (!shouldLogParseFailures) return;
  const maxLength = 2000;
  const snippet =
    rawText.length > maxLength
      ? `${rawText.slice(0, maxLength)}... [truncated]`
      : rawText;
  console.error(`[BA-WRITER] ${code}`, {
    detail,
    rawLength: rawText.length,
    rawSnippet: snippet,
  });
};

const parseBaWriterOutput = (rawText: string): BaWriterOutput => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    logParseFailure("invalid_json", rawText, error);
    throw new BaWriterError("invalid_json", "Model returned invalid JSON", error);
  }

  const result = baWriterSchema.safeParse(parsed);
  if (!result.success) {
    logParseFailure("schema_validation_failed", rawText, result.error.issues);
    throw new BaWriterError(
      "schema_validation_failed",
      "Model returned JSON with invalid schema",
      result.error
    );
  }

  return result.data;
};

export async function runBaWriter(input: BaWriterInput): Promise<BaWriterOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new BaWriterError("missing_api_key", "OpenRouter API key is not set");
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const userPrompt = buildUserPrompt(input);

  let rawText: string;
  try {
    rawText = await callOpenRouter({
      apiKey,
      model,
      messages: [
        { role: "system", content: BA_WRITER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: DEFAULT_TEMPERATURE,
    });
  } catch (error) {
    throw new BaWriterError("llm_error", "OpenRouter request failed", error);
  }

  return parseBaWriterOutput(rawText);
}
