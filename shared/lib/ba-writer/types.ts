import { z } from "zod";
import {
  baWriterBlockSchema,
  baWriterDocSchema,
  baWriterMissingInfoSchema,
  baWriterSchema,
  baWriterSectionIdSchema,
  baWriterStatusSchema,
  baWriterSuggestionSchema,
  baWriterTableTypeSchema,
} from "./schema";

export type BaWriterOutput = z.infer<typeof baWriterSchema>;
export type BaWriterDoc = z.infer<typeof baWriterDocSchema>;
export type BaWriterBlock = z.infer<typeof baWriterBlockSchema>;
export type BaWriterSuggestion = z.infer<typeof baWriterSuggestionSchema>;
export type BaWriterMissingInfo = z.infer<typeof baWriterMissingInfoSchema>;
export type BaWriterStatus = z.infer<typeof baWriterStatusSchema>;
export type BaWriterTableType = z.infer<typeof baWriterTableTypeSchema>;
export type BaWriterSectionId = z.infer<typeof baWriterSectionIdSchema>;

export type BaWriterDocMeta = {
  version?: string;
  status?: BaWriterStatus;
};

export type BaWriterInput = {
  notes: string;
  title?: string;
  docMeta?: BaWriterDocMeta;
};
