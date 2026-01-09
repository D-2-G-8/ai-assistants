import type { BaWriterInput, BaWriterOutput } from "@/shared/lib/ba-writer/types";

export const ERROR_HEADER = "x-ba-writer-error";

type ErrorResponse = {
  error: string;
};

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { error?: unknown }).error === "string";
};

export class BaWriterClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BaWriterClientError";
    this.status = status;
    this.code = code;
  }
}

export const runBaWriter = async (
  input: BaWriterInput
): Promise<BaWriterOutput> => {
  const response = await fetch("/api/ba-writer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const errorCode = response.headers.get(ERROR_HEADER) ?? undefined;
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message = isErrorResponse(payload)
      ? payload.error
      : "BA-writer request failed";
    throw new BaWriterClientError(message, response.status, errorCode);
  }

  return payload as BaWriterOutput;
};
