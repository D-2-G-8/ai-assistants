import { z } from "zod";
import { assistantResultSchema } from "@/platform/artifacts/schema";

export const docTypeSchema = z.enum([
  "business",
  "technical",
  "testcase",
  "autotest",
  "code",
]);

export const assistantActionSchema = z.enum([
  "lint",
  "draft",
  "extract",
  "generate",
  "refactor",
  "explain",
]);

export const assistantRunRequestSchema = z.object({
  documentId: z.string(),
  action: assistantActionSchema,
  assistantProfileId: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  dryRun: z.boolean().optional(),
  document: z.object({
    title: z.string(),
    docType: docTypeSchema,
    content: z.record(z.string(), z.unknown()),
    contentText: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    versionId: z.string(),
  }),
});

export const assistantRunResponseSchema = z.object({
  run: z.object({
    id: z.string(),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
    result: assistantResultSchema.optional(),
  }),
  promptSnapshot: z
    .object({
      system: z.string(),
      user: z.string(),
    })
    .optional(),
});
