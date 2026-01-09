import { NextResponse } from "next/server";
import { z } from "zod";
import { baWriterStatusSchema } from "@/shared/lib/ba-writer/schema";
import {
  BaWriterError,
  type BaWriterErrorCode,
  runBaWriter,
} from "@/shared/lib/ba-writer/service";
import { ERROR_HEADER } from "@/shared/lib/ba-writer/client";

export const dynamic = "force-dynamic";

const MAX_NOTES_LENGTH = 60000;

const requestSchema = z
  .object({
    title: z.string().optional(),
    notes: z.string(),
    docMeta: z
      .object({
        version: z.string().optional(),
        status: baWriterStatusSchema.optional(),
      })
      .optional(),
  })
  .strict();

const errorStatusByCode: Record<BaWriterErrorCode, number> = {
  invalid_json: 400,
  schema_validation_failed: 400,
  llm_error: 500,
  missing_api_key: 500,
};

const respondError = (status: number, code: string, message: string) => {
  const headers = new Headers();
  headers.set(ERROR_HEADER, code);
  return NextResponse.json({ error: message }, { status, headers });
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return respondError(400, "invalid_request", "Invalid request payload");
  }

  const notes = parsed.data.notes.trim();
  if (!notes) {
    return respondError(400, "notes_empty", "Notes must be a non-empty string");
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return respondError(400, "notes_too_long", "Notes are too long");
  }

  const title = parsed.data.title?.trim();
  const docMeta = (() => {
    if (!parsed.data.docMeta) return undefined;
    const version = parsed.data.docMeta.version?.trim();
    const status = parsed.data.docMeta.status;
    if (!version && !status) return undefined;
    return {
      version: version || undefined,
      status,
    };
  })();

  try {
    const result = await runBaWriter({
      notes,
      title: title || undefined,
      docMeta,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BaWriterError) {
      const status = errorStatusByCode[error.code] ?? 500;
      return respondError(status, error.code, "BA-WRITER request failed");
    }

    return respondError(500, "unknown_error", "Unexpected BA-WRITER error");
  }
}
