import { z } from "zod";

export const findingSeveritySchema = z.enum(["info", "warn", "error"]);
export const findingKindSchema = z.enum([
  "issue",
  "question",
  "recommendation",
]);

export const findingAnchorSchema = z
  .object({
    quote: z.string().optional().nullable(),
    startHint: z.string().optional().nullable(),
    endHint: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
  })
  .partial();

export const findingSchema = z.object({
  id: z.string(),
  severity: findingSeveritySchema,
  kind: findingKindSchema,
  message: z.string(),
  suggestion: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  anchor: findingAnchorSchema.optional(),
  source: z.enum(["ai", "user"]).optional().default("ai"),
});

export const jsonPatchOpSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string(),
  from: z.string().optional(),
  value: z.unknown().optional(),
});

export const blockSchema = z.object({
  type: z.enum(["paragraph", "heading"]),
  text: z.string(),
  level: z.number().int().min(1).max(6).optional(),
});

export const artifactBaseSchema = z.object({
  id: z.string(),
  apply: z.enum(["manual", "auto"]).default("manual"),
  requiresHumanReview: z.boolean().default(true),
});

export const docPatchArtifactSchema = artifactBaseSchema.extend({
  type: z.literal("doc_patch"),
  patchType: z.literal("jsonPatch"),
  patch: z.array(jsonPatchOpSchema),
});

export const blocksArtifactSchema = artifactBaseSchema.extend({
  type: z.literal("blocks"),
  patchType: z.literal("blocks"),
  blocks: z.array(blockSchema),
});

export const artifactSchema = z.discriminatedUnion("type", [
  docPatchArtifactSchema,
  blocksArtifactSchema,
]);

export const assistantResultSchema = z.object({
  findings: z.array(findingSchema),
  artifacts: z.array(artifactSchema),
});

export type AssistantResult = z.infer<typeof assistantResultSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
export type Block = z.infer<typeof blockSchema>;
