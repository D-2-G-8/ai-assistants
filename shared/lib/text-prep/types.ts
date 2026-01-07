export type TableMode = "keep" | "kv";

export interface PrepareTextOptions {
  maxHeadingDepth?: 1 | 2 | 3 | 4 | 5 | 6;
  tableMode?: TableMode;
  dedupeHeadings?: boolean;
  dropArtifacts?: boolean;
  dropNoiseLines?: boolean;
  maxChars?: number;
  promotePseudoHeadings?: boolean;
  headingHints?: (string | RegExp)[];
  restructureProcessBlocks?: boolean;
  unwrapAccidentalFences?: boolean;
}

export interface PrepareTextResult {
  cleanedText: string;
  outline: string[];
  stats: {
    chars: number;
    lines: number;
    approxTokens: number;
  };
  warnings: string[];
}
