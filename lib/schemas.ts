import { z } from "zod";

export const issueSchema = z.object({
  id: z.string(),
  severity: z.enum(["blocker", "warning", "suggestion"]),
  category: z.enum([
    "missing",
    "ambiguity",
    "consistency",
    "testability",
    "glossary",
    "scope",
  ]),
  quote: z.string().optional().nullable(),
  message: z.string(),
  fix_suggestion: z.string(),
  startHint: z.string().optional().nullable(),
  endHint: z.string().optional().nullable(),
  question: z.string().optional().nullable(),
});

export const questionSchema = z.object({
  id: z.string(),
  severity: z.enum(["blocker", "warning"]),
  question: z.string(),
  reason: z.string(),
});

export const lintResponseSchema = z.object({
  issues: z.array(issueSchema),
  questions: z.array(questionSchema),
});

export const lintRequestSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  contentJson: z.unknown().optional(),
  dryRun: z.boolean().optional(),
  status: z.enum(["draft", "ready"]).optional(),
  qaContext: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional(),
}).refine((data) => Boolean(data.content || data.contentJson), {
  message: "content or contentJson is required",
});

export type LintResponse = z.infer<typeof lintResponseSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Question = z.infer<typeof questionSchema>;
export type LintRequest = z.infer<typeof lintRequestSchema>;
