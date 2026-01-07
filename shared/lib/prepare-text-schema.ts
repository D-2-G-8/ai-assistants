import { z } from "zod";

export const prepareTextOptionsSchema = z
  .object({
    maxHeadingDepth: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]).optional(),
    tableMode: z.enum(["keep", "kv"]).optional(),
    dedupeHeadings: z.boolean().optional(),
    dropArtifacts: z.boolean().optional(),
    dropNoiseLines: z.boolean().optional(),
    maxChars: z.number().int().positive().optional(),
  })
  .strict();

export const prepareTextRequestSchema = z
  .object({
    text: z.string(),
    options: prepareTextOptionsSchema.optional(),
  })
  .strict();
