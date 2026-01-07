import { looksLikeHtml } from "./detect";
import { sanitizeHtmlToSafeHtml } from "./sanitize";
import { htmlToMarkdown } from "./htmlToMd";
import { normalizeMarkdown } from "./normalize";
import { preprocessMarkdown } from "./preprocess";
import { buildOutline, cleanAst, parseMarkdown, toMarkdown } from "./markdownAst";
import type { PrepareTextOptions, PrepareTextResult } from "./types";
import prettier from "prettier/standalone";
import parserMarkdown from "prettier/parser-markdown";

const DEFAULT_OPTIONS: Required<PrepareTextOptions> = {
  maxHeadingDepth: 4,
  tableMode: "keep",
  dedupeHeadings: true,
  dropArtifacts: true,
  dropNoiseLines: true,
  maxChars: 120_000,
  promotePseudoHeadings: true,
  headingHints: [],
  restructureProcessBlocks: false,
  unwrapAccidentalFences: true,
};

const resolveOptions = (options?: PrepareTextOptions): Required<PrepareTextOptions> => ({
  ...DEFAULT_OPTIONS,
  ...(options ?? {}),
});

const buildStats = (cleanedText: string) => {
  const chars = cleanedText.length;
  const lines = cleanedText ? cleanedText.split("\n").length : 0;
  return {
    chars,
    lines,
    approxTokens: Math.ceil(chars / 4),
  };
};

export const prepareText = (
  input: string,
  options?: PrepareTextOptions
): PrepareTextResult => {
  const resolved = resolveOptions(options);
  const warnings: string[] = [];

  let working = input ?? "";
  if (resolved.maxChars && working.length > resolved.maxChars) {
    working = working.slice(0, resolved.maxChars);
    warnings.push(`Truncated input to ${resolved.maxChars} chars`);
  }

  if (looksLikeHtml(working)) {
    const safeHtml = sanitizeHtmlToSafeHtml(working);
    working = htmlToMarkdown(safeHtml);
  }

  const normalized = normalizeMarkdown(working, {
    collapseSpaces: false,
    formatLists: false,
    normalizeWhitespace: false,
  });
  const { text: preprocessed, warnings: preprocessWarnings } =
    preprocessMarkdown(normalized, {
      maxHeadingDepth: resolved.maxHeadingDepth,
      tableMode: resolved.tableMode,
      promotePseudoHeadings: resolved.promotePseudoHeadings,
      headingHints: resolved.headingHints,
      restructureProcessBlocks: resolved.restructureProcessBlocks,
      unwrapAccidentalFences: resolved.unwrapAccidentalFences,
    });
  warnings.push(...preprocessWarnings);

  const ast = parseMarkdown(preprocessed);
  const { ast: cleanedAst, warnings: astWarnings } = cleanAst(ast, {
    maxHeadingDepth: resolved.maxHeadingDepth,
    tableMode: resolved.tableMode,
    dedupeHeadings: resolved.dedupeHeadings,
    dropArtifacts: resolved.dropArtifacts,
    dropNoiseLines: resolved.dropNoiseLines,
  });

  warnings.push(...astWarnings);

  const cleanedText = normalizeMarkdown(toMarkdown(cleanedAst));
  let formattedText = cleanedText;
  try {
    const markdownPlugin =
      (parserMarkdown as unknown as { default?: unknown }).default ??
      parserMarkdown;
    formattedText = prettier.format(cleanedText, {
      parser: "markdown",
      proseWrap: "preserve",
      plugins: [markdownPlugin],
    });
  } catch {
    formattedText = cleanedText;
  }
  const outline = buildOutline(cleanedAst, {
    maxHeadingDepth: resolved.maxHeadingDepth,
  });

  return {
    cleanedText: formattedText.trim(),
    outline,
    stats: buildStats(formattedText),
    warnings,
  };
};

export type { PrepareTextOptions, PrepareTextResult } from "./types";
