import { prepareText } from "@/shared/lib/text-prep";

const PLACEHOLDER_TITLE_RE =
  /^(new product doc|untitled document|untitled)$/i;
const GENERIC_TITLE_TOKENS = new Set(["анализ", "контекст"]);
const MAX_OUTLINE_ITEMS = 30;

const formatOutlineList = (outline: string[]) => {
  if (outline.length === 0) return "- (none)";
  return outline.slice(0, MAX_OUTLINE_ITEMS).map((item) => `- ${item}`).join("\n");
};

const formatQaContext = (
  qaContext: Array<{ id: string; question: string; answer: string }>
) =>
  qaContext
    .map(
      (item) =>
        `- Q(${item.id}): ${item.question}\n  A: ${item.answer || "(empty)"}`
    )
    .join("\n");

const normalizeSpaces = (input: string) =>
  input.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

const normalizeHeadingText = (input: string) => {
  const output = input.replace(/["'`«»]/g, "").replace(/[:.]+$/, "");
  return normalizeSpaces(output);
};

const isPlaceholderTitle = (title: string) =>
  PLACEHOLDER_TITLE_RE.test(title.trim());

const isGenericTitle = (title: string) =>
  GENERIC_TITLE_TOKENS.has(normalizeHeadingText(title).toLowerCase());

const resolveDocTitle = (
  title: string | undefined,
  outline: string[],
  cleanedText: string
) => {
  const trimmedTitle = (title ?? "").trim();
  if (trimmedTitle && !isPlaceholderTitle(trimmedTitle)) {
    return trimmedTitle;
  }

  const outlineCandidate = outline.find((item) => !isGenericTitle(item));
  if (outlineCandidate) return outlineCandidate;

  const firstLine = cleanedText.split("\n").find((line) => line.trim());
  if (firstLine && !isGenericTitle(firstLine)) {
    return normalizeHeadingText(firstLine);
  }

  return trimmedTitle || "Untitled Document";
};

export const buildDocumentPromptParts = (params: {
  title?: string;
  content: string;
  qaContext?: Array<{ id: string; question: string; answer: string }>;
}) => {
  let prepResult: ReturnType<typeof prepareText> | null = null;
  let cleanedText = params.content;
  let outline: string[] = [];

  try {
    prepResult = prepareText(params.content, { tableMode: "keep" });
    cleanedText = prepResult.cleanedText || params.content;
    outline = prepResult.outline;
    if (prepResult.warnings.length > 0) {
      console.warn("prepareText warnings:", prepResult.warnings);
    }
  } catch (error) {
    console.error("prepareText failed", error);
  }

  const docTitle = resolveDocTitle(params.title, outline, cleanedText);

  const promptSections = [
    `Title: ${docTitle}`,
    `Document outline:\n${formatOutlineList(outline)}`,
    `Document:\n${cleanedText}`,
  ];

  if (params.qaContext && params.qaContext.length > 0) {
    promptSections.push(`Q&A context:\n${formatQaContext(params.qaContext)}`);
  }

  return {
    docTitle,
    outline,
    cleanedText,
    userPrompt: promptSections.join("\n\n"),
    prepResult,
  };
};
