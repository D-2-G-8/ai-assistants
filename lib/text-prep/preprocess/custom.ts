import type { PrepareTextOptions } from "../types";

export type PreprocessOptions = Required<
  Pick<
    PrepareTextOptions,
    | "maxHeadingDepth"
    | "tableMode"
    | "promotePseudoHeadings"
    | "headingHints"
    | "restructureProcessBlocks"
    | "unwrapAccidentalFences"
  >
>;

type PreprocessResult = {
  text: string;
  warnings: string[];
};

const isFenceLine = (line: string) => line.trim().startsWith("```");

const getFenceInfo = (line: string) => line.trim().slice(3).trim();

const FILE_NAME_ONLY_RE =
  /^[^\n\\/]+?\.(png|jpe?g|webp)(?:\s*\(\d+\))?$/i;
const SIZE_ONLY_RE = /^\d+(?:\.\d+)?\s*(kb|mb|gb)\b/i;

const isAttachmentFilenameLine = (line: string) =>
  FILE_NAME_ONLY_RE.test(line.trim());

const isPlaceholderGlyphLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^[\uFFFC]+$/.test(trimmed);
};

const isAttachmentArtifactLine = (
  line: string,
  prevLine: string | null,
  nextLine: string | null
) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isAttachmentFilenameLine(trimmed)) return true;
  if (SIZE_ONLY_RE.test(trimmed)) {
    return true;
  }
  if (isPlaceholderGlyphLine(trimmed)) return true;
  return false;
};

const removeAttachmentArtifacts = (input: string) => {
  const lines = input.split("\n");
  const output: string[] = [];
  let removed = 0;

  lines.forEach((line, index) => {
    const prevLine = index > 0 ? lines[index - 1] : null;
    const nextLine = index < lines.length - 1 ? lines[index + 1] : null;
    if (isAttachmentArtifactLine(line, prevLine, nextLine)) {
      removed += 1;
      return;
    }
    output.push(line);
  });

  return { text: output.join("\n"), removed };
};

const isStandaloneLine = (lines: string[], index: number) => {
  const current = lines[index];
  if (!current || current.trim() === "") return false;
  const prev = index > 0 ? lines[index - 1].trim() : "";
  const next = index < lines.length - 1 ? lines[index + 1].trim() : "";
  const hasPrevGap = index === 0 || prev === "";
  const hasNextGap = index === lines.length - 1 || next === "";
  return hasPrevGap && hasNextGap;
};

const isMarkdownHeading = (line: string) => /^\s*#{1,6}\s+/.test(line);

const splitPseudoRow = (line: string) => {
  if (line.includes("\t")) {
    return line.split(/\t+/).map((cell) => cell.trim());
  }
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map((cell) => cell.trim());
  }
  return null;
};

const isPseudoTableLine = (line: string) => {
  if (!line.trim()) return false;
  if (line.includes("|")) return false;
  if (isMarkdownHeading(line)) return false;
  const cells = splitPseudoRow(line);
  if (!cells) return false;
  const nonEmpty = cells.filter((cell) => cell !== "");
  return nonEmpty.length >= 3;
};

const isHeaderRow = (cells: string[]) => {
  if (cells.length < 2) return false;
  const avgLen =
    cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
  const punctuation = cells.join(" ").match(/[.,;:!?]/g)?.length ?? 0;
  const digits = cells.join("").match(/\d/g)?.length ?? 0;
  if (avgLen >= 25) return false;
  if (digits > Math.max(4, cells.length)) return false;
  return punctuation <= Math.max(2, cells.length);
};

const nextHeadingLevel = (
  lastHeadingLevel: number | null,
  maxHeadingDepth: number,
  preferred: number
) => {
  if (lastHeadingLevel && lastHeadingLevel < maxHeadingDepth) {
    return Math.min(maxHeadingDepth, lastHeadingLevel + 1);
  }
  return Math.min(maxHeadingDepth, preferred);
};

const makeHeadingLine = (level: number, text: string) =>
  `${"#".repeat(level)} ${text.trim()}`;

const numberedHeadingMatch = (line: string) =>
  line.match(/^\s*(\d+(?:\.\d+)*)([.)])\s+\S.{3,160}\s*$/);

const stripNumberPrefix = (line: string) =>
  line.replace(/^\s*\d+(?:\.\d+)*[.)]\s+/, "").trim();

const getNumberedDepth = (line: string) => {
  const match = numberedHeadingMatch(line);
  if (!match) return null;
  const segments = match[1].split(".");
  return segments.length;
};

const matchesHeadingHint = (line: string, hints: (string | RegExp)[]) => {
  if (hints.length === 0) return false;
  return hints.some((hint) => {
    if (typeof hint === "string") {
      return line.toLowerCase().includes(hint.toLowerCase());
    }
    return hint.test(line);
  });
};

const isMarkdownTableStart = (lines: string[], index: number) => {
  if (index < 0 || index >= lines.length - 1) return false;
  const header = lines[index];
  const divider = lines[index + 1];
  if (!header.includes("|")) return false;
  if (!divider) return false;
  return /^\s*\|?\s*:?-{2,}/.test(divider);
};

const isPseudoTableStart = (lines: string[], index: number) => {
  if (index < 0 || index >= lines.length) return false;
  if (!isPseudoTableLine(lines[index])) return false;
  const second = lines[index + 1];
  const third = lines[index + 2];
  if (!second || !third) return false;
  return isPseudoTableLine(second) && isPseudoTableLine(third);
};

const isHeaderLikeLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (/^\d+([.)]|\.)\s+/.test(trimmed)) return false;
  if ((trimmed.match(/,/g)?.length ?? 0) >= 2) return false;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 6) return false;
  const digits = trimmed.match(/\d/g)?.length ?? 0;
  if (digits > 4) return false;
  return true;
};

const isHeaderLikeHorizontal = (line: string) => {
  if (!isHeaderLikeLine(line)) return false;
  return line.trim().length <= 60;
};

const hasStrongHeaderUniqueness = (headers: string[]) => {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const uniqueCount = new Set(normalized.filter(Boolean)).size;
  if (normalized.length === 0) return false;
  return uniqueCount / normalized.length >= 0.8;
};

const isCodeLikeLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[{}]/.test(trimmed)) return true;
  if (/=>|;/.test(trimmed)) return true;
  if (/`{1,}/.test(trimmed)) return true;
  if (/[\[\]]/.test(trimmed) && /[^\w\s]/.test(trimmed)) return true;
  if (/::|<>/.test(trimmed)) return true;
  if ((trimmed.match(/,/g)?.length ?? 0) >= 2) return true;
  if (/^\s*(enum|type|interface)\b/i.test(trimmed)) return true;
  if (/:\s*\S/.test(trimmed) && /[{}[\]]/.test(trimmed)) return true;

  const letters = trimmed.match(/[A-Za-zА-Яа-яЁё]/g)?.length ?? 0;
  const symbols = trimmed.replace(/[A-Za-zА-Яа-яЁё0-9\s]/g, "").length;
  if (letters > 0 && symbols / letters > 0.6) return true;
  return false;
};

const countCodeLikeLines = (lines: string[]) =>
  lines.filter((line) => isCodeLikeLine(line)).length;

const isCodeLikeBlock = (lines: string[]) =>
  countCodeLikeLines(lines.slice(0, 8)) >= 2;

const hasExplicitAlignmentLine = (line: string) => !!splitPseudoRow(line);

const isListLine = (line: string) =>
  /^\s*([-*+•]|\d+[.)])\s+/.test(line);

const isListBlockStart = (lines: string[], index: number) => {
  const current = lines[index];
  if (!current || !isListLine(current)) return false;
  const next = lines[index + 1] ?? "";
  return isListLine(next);
};

const isParagraphLikeLine = (line: string) => {
  const trimmed = line.trim();
  if (trimmed.length > 120) return true;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 12 && /[.!?]/.test(trimmed)) return true;
  return false;
};

const isContinuationLine = (line: string) => {
  if (!line.trim()) return false;
  if (/^\s+/.test(line)) return true;
  if (/^\s*([-•*]|\d+[.)])\s+/.test(line)) return true;
  return false;
};

const getListNumber = (line: string) => {
  const match = line.trim().match(/^(\d+)[.)]\s+/);
  if (!match) return null;
  return Number(match[1]);
};

const buildCellText = (lines: string[]) =>
  lines.map((line) => line.trim()).filter(Boolean).join("<br>");

const isRequestResponseMarker = (line: string) =>
  /^\s*(Запрос|Ответ|Формат ошибок|Request|Response)\s*:?\s*$/i.test(
    line.trim()
  );

const detectVerticalTableMultiline = (
  lines: string[],
  startIndex: number
): { headers: string[]; rows: string[][]; endIndex: number } | null => {
  if (startIndex < 0 || startIndex >= lines.length) return null;
  if (!isHeaderLikeLine(lines[startIndex] ?? "")) return null;
  if (isRequestResponseMarker(lines[startIndex] ?? "")) return null;

  const headers: string[] = [];
  let cursor = startIndex;
  while (cursor < lines.length && headers.length < 12) {
    const line = lines[cursor];
    if (!line || !line.trim()) break;
    if (!isHeaderLikeLine(line)) break;
    headers.push(line.trim());
    cursor += 1;
  }
  if (headers.length < 3) return null;
  if (!hasStrongHeaderUniqueness(headers)) return null;

  const cells: string[][] = [];
  let current: string[] = [];
  let seenRows = 0;
  let blankRun = 0;
  let lastListNumber: number | null = null;
  let inListBlock = false;
  let lastIndex = cursor;

  for (let i = cursor; i < lines.length; i += 1) {
    const line = lines[i];
    lastIndex = i;
    if (
      isFenceLine(line) ||
      isMarkdownHeading(line) ||
      isRequestResponseMarker(line)
    ) {
      if (current.length) cells.push(current);
      cursor = i;
      break;
    }
    if (!line || !line.trim()) {
      blankRun += 1;
      if (cells.length >= headers.length) {
        let lookahead = i + 1;
        while (lookahead < lines.length && !lines[lookahead].trim()) {
          lookahead += 1;
        }
        const nextLine = lines[lookahead] ?? "";
        if (
          blankRun >= 1 &&
          (isRequestResponseMarker(nextLine) ||
            isMarkdownHeading(nextLine) ||
            isHeaderLikeLine(nextLine))
        ) {
          if (current.length) cells.push(current);
          cursor = i + 1;
          break;
        }
      }
      if (blankRun >= 2 && cells.length >= headers.length) {
        if (current.length) cells.push(current);
        cursor = i + 1;
        break;
      }
      continue;
    }
    blankRun = 0;

    const isContinuation = isContinuationLine(line);
    const listNumber = getListNumber(line);

    if (
      current.length > 0 &&
      isContinuation &&
      !(inListBlock && listNumber === 1 && lastListNumber && lastListNumber > 1)
    ) {
      current.push(line);
      if (listNumber) {
        inListBlock = true;
        lastListNumber = listNumber;
      }
      continue;
    }

    if (current.length > 0) {
      cells.push(current);
      if (cells.length % headers.length === 0) seenRows += 1;
    }
    current = [line];
    inListBlock = !!listNumber;
    lastListNumber = listNumber;
  }

  if (current.length > 0) cells.push(current);
  const totalCells = cells.length;
  if (totalCells < headers.length) return null;

  const rowCount = Math.floor(totalCells / headers.length);
  if (rowCount < 1) return null;

  const rows: string[][] = [];
  for (let r = 0; r < rowCount; r += 1) {
    const rowCells = cells
      .slice(r * headers.length, (r + 1) * headers.length)
      .map(buildCellText);
    rows.push(rowCells);
  }

  const flattened = rows.flat();
  if (!passesCellQualityLoose(flattened)) return null;

  return {
    headers,
    rows,
    endIndex: cursor === startIndex ? lastIndex + 1 : cursor,
  };
};

const isApiStanzaStart = (lines: string[], index: number) => {
  const current = lines[index]?.trim() ?? "";
  const next = lines[index + 1]?.trim() ?? "";
  if (!/^(GET|POST|PUT|PATCH|DELETE)$/i.test(current)) return false;
  if (!/^\/\S+/.test(next)) return false;
  return true;
};

const isApiLikeLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[A-Z]{2,8}$/.test(trimmed)) return true;
  if (/^\/\S+$/.test(trimmed)) return true;
  if (/^[A-Za-z]{3,12}$/.test(trimmed)) return true;
  return false;
};

const isApiStanzaLikeRegion = (lines: string[]) => {
  const sample = lines.slice(0, 8).filter((line) => line.trim() !== "");
  if (sample.length < 3) return false;
  const apiLikeCount = sample.filter((line) => isApiLikeLine(line)).length;
  return apiLikeCount / sample.length >= 0.7;
};

const isCellLikeLine = (line: string) => {
  if (!line.trim()) return false;
  if (isMarkdownHeading(line)) return false;
  if (isListLine(line)) return false;
  if (isFenceLine(line)) return false;
  if (isParagraphLikeLine(line)) return false;
  return true;
};

type CellShape = "numeric" | "identifier" | "pathlike" | "sentence" | "short";

const classifyCellShape = (value: string): CellShape => {
  const trimmed = value.trim();
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) return "numeric";
  if (/^\w+$/.test(trimmed)) return "identifier";
  if (/^\S+$/.test(trimmed) && /[.\[]/.test(trimmed)) return "pathlike";
  if (/\s+/.test(trimmed) && /[.!?]/.test(trimmed)) return "sentence";
  return "short";
};

const columnConsistencyScore = (rows: string[][]) => {
  if (rows.length === 0) return 0;
  const columnCount = Math.max(...rows.map((row) => row.length));
  let total = 0;
  for (let col = 0; col < columnCount; col += 1) {
    const tally = new Map<CellShape, number>();
    rows.forEach((row) => {
      const cell = row[col] ?? "";
      const shape = classifyCellShape(cell);
      tally.set(shape, (tally.get(shape) ?? 0) + 1);
    });
    const counts = Array.from(tally.values());
    const dominant = counts.length ? Math.max(...counts) : 0;
    const ratio = rows.length ? dominant / rows.length : 0;
    if (ratio < 0.65) return 0;
    total += ratio;
  }
  return total / columnCount;
};

const headerQualityScore = (headers: string[]) => {
  if (headers.length === 0) return 0;
  const valid = headers.filter((header) => isHeaderLikeLine(header)).length;
  const uniqueScore = hasStrongHeaderUniqueness(headers) ? 1 : 0;
  return (valid / headers.length) * 0.7 + uniqueScore * 0.3;
};

const cellQualityScore = (cells: string[]) => {
  if (!passesCellQuality(cells)) return 0;
  const avgLen =
    cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
  return Math.max(0, Math.min(1, (100 - avgLen) / 100));
};

const passesCellQuality = (cells: string[]) => {
  if (cells.length === 0) return false;
  const avgLen =
    cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
  const punctCount = cells.filter((cell) => /[.!?]/.test(cell)).length;
  const listCount = cells.filter((cell) => /^\d+[.)]\s/.test(cell)).length;
  const punctFraction = punctCount / cells.length;
  const listFraction = listCount / cells.length;
  return avgLen <= 100 && punctFraction <= 0.5 && listFraction <= 0.3;
};

const passesCellQualityLoose = (cells: string[]) => {
  if (cells.length === 0) return false;
  const avgLen =
    cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
  const punctCount = cells.filter((cell) => /[.!?]/.test(cell)).length;
  const punctFraction = punctCount / cells.length;
  return avgLen <= 400 && punctFraction <= 0.7;
};

const detectVerticalTable = (
  lines: string[]
): { headers: string[]; rows: string[][] } | null => {
  if (lines.length < 6) return null;
  let bestScore = 0;
  let best: { headers: string[]; rows: string[][] } | null = null;
  let secondScore = 0;

  const headerRunLine = (line: string) => {
    if (!isHeaderLikeLine(line)) return false;
    const wordCount = line.trim().split(/\s+/).length;
    if (wordCount > 3) return false;
    return classifyCellShape(line) === "short";
  };
  let headerRun = lines.findIndex((line) => !headerRunLine(line));
  if (headerRun === -1) headerRun = lines.length;
  const minHeaderCount = headerRun >= 3 ? headerRun : 2;
  const maxHeaders = Math.min(12, lines.length - 2);
  for (let headerCount = 2; headerCount <= maxHeaders; headerCount += 1) {
    if (headerRun >= 3 && headerCount < minHeaderCount) continue;
    const headers = lines.slice(0, headerCount);
    const values = lines.slice(headerCount);
    if (values.length < headerCount * 2) continue;
    if (headerCount === 2 && values.length < headerCount * 3) continue;
    if (values.length % headerCount !== 0) continue;
    if (!headers.every(isHeaderLikeLine)) continue;
    if (!hasStrongHeaderUniqueness(headers)) continue;

    const rows: string[][] = [];
    for (let r = 0; r < values.length; r += headerCount) {
      rows.push(values.slice(r, r + headerCount));
    }

    const headerScore = headerQualityScore(headers);
    const consistencyScore = columnConsistencyScore(rows);
    if (consistencyScore <= 0) continue;
    const cellScore = cellQualityScore(values);
    if (cellScore <= 0) continue;

    let score = headerScore * 0.4 + consistencyScore * 0.4 + cellScore * 0.2;
    if (headerCount === 2) score *= 0.7;
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = { headers, rows };
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (!best) return null;
  if (bestScore < 0.72) return null;
  if (bestScore - secondScore < 0.08) return null;
  return best;
};

const convertPseudoTables = (
  input: string,
  options: PreprocessOptions
): { text: string; converted: number } => {
  const lines = input.split("\n");
  const output: string[] = [];
  let converted = 0;
  let inFence = false;
  const headingLevel = Math.min(options.maxHeadingDepth, 3);

  const escapeCell = (value: string) => value.replace(/\|/g, "\\|").trim();
  const buildMarkdownTable = (headers: string[], rows: string[][]) => {
    const safeHeaders = headers.map((header) => escapeCell(header || "—"));
    const headerLine = `| ${safeHeaders.join(" | ")} |`;
    const dividerLine = `| ${safeHeaders.map(() => "---").join(" | ")} |`;
    const rowLines = rows.map((row) => {
      const cells = safeHeaders.map((_, index) => {
        const cell = row[index] ?? "";
        return escapeCell(cell || "—");
      });
      return `| ${cells.join(" | ")} |`;
    });
    return [headerLine, dividerLine, ...rowLines];
  };

  const applyTitleHeading = (title: string | null) => {
    if (!title) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const last = output[output.length - 1];
    if (last && last.trim() === trimmed && !isMarkdownHeading(last)) {
      output[output.length - 1] = makeHeadingLine(headingLevel, trimmed);
      return;
    }
    output.push(makeHeadingLine(headingLevel, trimmed));
  };

  const updateOutputHeading = (line: string) => {
    const match = line.match(/^\s*(#{1,6})\s+/);
    if (match) {
      output.push(line);
      return true;
    }
    return false;
  };

  const findCandidateBlock = (startIndex: number) => {
    const startLine = lines[startIndex];
    if (!startLine) return null;
    if (!startLine.trim()) return null;
    if (isMarkdownHeading(startLine)) return null;
    if (isListBlockStart(lines, startIndex)) return null;
    if (isFenceLine(startLine)) return null;
    if (!isCellLikeLine(startLine)) return null;
    if (
      !hasExplicitAlignmentLine(startLine) &&
      hasExplicitAlignmentLine(lines[startIndex + 1] ?? "")
    ) {
      return null;
    }
    if (isApiStanzaStart(lines, startIndex)) {
      const alignmentLines = lines
        .slice(startIndex, startIndex + 3)
        .filter((line) => hasExplicitAlignmentLine(line)).length;
      if (alignmentLines < 2) return null;
    }

    const block: string[] = [];
    let alignmentLines = 0;
    let i = startIndex;
    while (i < lines.length) {
      const current = lines[i];
      if (!current || !current.trim()) break;
      if (isFenceLine(current)) break;
      if (isMarkdownHeading(current)) break;
      if (isListBlockStart(lines, i)) break;
      if (!isCellLikeLine(current)) break;
      if (isApiStanzaStart(lines, i) && alignmentLines < 3) break;
      if (hasExplicitAlignmentLine(current)) alignmentLines += 1;
      block.push(current);
      i += 1;
    }

    if (block.length < 3) return null;
    return {
      start: startIndex,
      end: i,
      lines: block,
      alignmentLines,
    };
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isFenceLine(line)) {
      inFence = !inFence;
      output.push(line);
      i += 1;
      continue;
    }
    if (inFence) {
      output.push(line);
      i += 1;
      continue;
    }

    if (updateOutputHeading(line)) {
      i += 1;
      continue;
    }

    const verticalMultiline = detectVerticalTableMultiline(lines, i);
    if (verticalMultiline) {
      const titleIndex = i - 1;
      if (titleIndex >= 0) {
        const titleLine = lines[titleIndex];
        if (
          titleLine &&
          titleLine.trim() &&
          !isHeaderLikeLine(titleLine) &&
          !isMarkdownHeading(titleLine) &&
          !isFenceLine(titleLine)
        ) {
          output.push(makeHeadingLine(headingLevel, titleLine.trim()));
        }
      }
      output.push(
        ...buildMarkdownTable(
          verticalMultiline.headers,
          verticalMultiline.rows
        )
      );
      output.push("");
      converted += 1;
      i = verticalMultiline.endIndex;
      continue;
    }

    const candidate = findCandidateBlock(i);
    if (!candidate) {
      output.push(line);
      i += 1;
      continue;
    }

    const blockLines = candidate.lines;
    const codeLikeLines = countCodeLikeLines(blockLines.slice(0, 8));
    if (codeLikeLines >= 2 && candidate.alignmentLines < 3) {
      output.push(...blockLines);
      i = candidate.end;
      continue;
    }
    if (isApiStanzaLikeRegion(blockLines) && candidate.alignmentLines < 3) {
      output.push(...blockLines);
      i = candidate.end;
      continue;
    }
    const titleIndex = candidate.start - 1;
    let title: string | null = null;
    if (titleIndex >= 0) {
      const titleLine = lines[titleIndex];
      if (
        titleLine &&
        titleLine.trim() &&
        !isCellLikeLine(titleLine) &&
        !isMarkdownHeading(titleLine) &&
        !isFenceLine(titleLine)
      ) {
        title = titleLine.trim();
      }
    }

    const hasAlignment = candidate.alignmentLines >= 3;
    let convertedBlock = false;

    if (hasAlignment) {
      const rows = blockLines.map((row) => splitPseudoRow(row));
      if (rows.every(Boolean)) {
        const normalizedRows = rows as string[][];
        const columnCount = normalizedRows[0].length;
        if (
          columnCount >= 3 &&
          normalizedRows.every((row) => row.length === columnCount)
        ) {
          const headerRow = normalizedRows[0];
          const headers = headerRow.map((cell, index) =>
            cell.trim() || `Col${index + 1}`
          );
          const dataRows = normalizedRows.slice(1);
          const dataCells = dataRows.flat().map((cell) => cell.trim());
          const consistency = columnConsistencyScore(dataRows);
          if (
            dataRows.length >= 2 &&
            headers.every(isHeaderLikeHorizontal) &&
            hasStrongHeaderUniqueness(headers) &&
            passesCellQuality(dataCells) &&
            consistency >= 0.65 &&
            dataRows.length >= 2
          ) {
            applyTitleHeading(title);
            output.push(...buildMarkdownTable(headers, dataRows));
            output.push("");
            converted += 1;
            convertedBlock = true;
          }
        }
      }
    }

    if (!convertedBlock && !hasAlignment) {
      let vertical = detectVerticalTable(blockLines.map((line) => line.trim()));
      let titleFromBlock: string | null = null;

      if (!vertical && blockLines.length >= 4) {
        const firstLine = blockLines[0].trim();
        if (
          firstLine &&
          firstLine.length <= 60 &&
          !isListLine(firstLine) &&
          !isMarkdownHeading(firstLine) &&
          !isParagraphLikeLine(firstLine)
        ) {
          const sliced = blockLines.slice(1).map((line) => line.trim());
          const slicedVertical = detectVerticalTable(sliced);
          if (slicedVertical) {
            vertical = slicedVertical;
            titleFromBlock = firstLine;
          }
        }
      }

      if (vertical) {
        applyTitleHeading(titleFromBlock ?? title);
        output.push(...buildMarkdownTable(vertical.headers, vertical.rows));
        output.push("");
        converted += 1;
        convertedBlock = true;
      }
    }

    if (!convertedBlock) {
      output.push(...blockLines);
    }

    i = candidate.end;
  }

  return { text: output.join("\n").trimEnd(), converted };
};

const promotePseudoHeadings = (
  input: string,
  options: PreprocessOptions
): { text: string; promoted: number } => {
  if (!options.promotePseudoHeadings) return { text: input, promoted: 0 };
  const lines = input.split("\n");
  const output: string[] = [];
  let promoted = 0;
  let inFence = false;
  let lastHeadingLevel: number | null = null;

  lines.forEach((line, index) => {
    if (isFenceLine(line)) {
      inFence = !inFence;
      output.push(line);
      return;
    }
    if (inFence) {
      output.push(line);
      return;
    }
    if (isMarkdownHeading(line)) {
      const match = line.match(/^\s*(#{1,6})\s+/);
      if (match) lastHeadingLevel = match[1].length;
      output.push(line);
      return;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      output.push(line);
      return;
    }

    const standalone = isStandaloneLine(lines, index);
    if (getNumberedDepth(trimmed)) {
      const hasPrevGap = index === 0 || lines[index - 1].trim() === "";
      if (!hasPrevGap) {
        output.push(line);
        return;
      }
      if (/[.!?]$/.test(trimmed)) {
        output.push(line);
        return;
      }
      const nextLine = lines[index + 1] ?? "";
      const nextIsNumbered = !!numberedHeadingMatch(nextLine);
      if (nextIsNumbered && trimmed.length > 80 && nextLine.trim() !== "") {
        output.push(line);
        return;
      }

      const depth = getNumberedDepth(trimmed) ?? 1;
      const level = Math.min(options.maxHeadingDepth, depth + 1);
      const title = stripNumberPrefix(trimmed);
      output.push(makeHeadingLine(level, title));
      promoted += 1;
      lastHeadingLevel = level;
      return;
    }

    if (
      (index === 0 || lines[index - 1].trim() === "") &&
      (isMarkdownTableStart(lines, index + 1) ||
        isPseudoTableStart(lines, index + 1))
    ) {
      const level = Math.min(options.maxHeadingDepth, 2);
      output.push(makeHeadingLine(level, trimmed));
      promoted += 1;
      lastHeadingLevel = level;
      return;
    }

    if (
      standalone &&
      matchesHeadingHint(trimmed, options.headingHints) &&
      trimmed.length >= 3 &&
      trimmed.length <= 160
    ) {
      const level = nextHeadingLevel(
        lastHeadingLevel,
        options.maxHeadingDepth,
        2
      );
      output.push(makeHeadingLine(level, trimmed));
      promoted += 1;
      lastHeadingLevel = level;
      return;
    }

    output.push(line);
  });

  return { text: output.join("\n"), promoted };
};

const unwrapAccidentalFences = (
  input: string,
  enabled: boolean
): { text: string; unwrapped: number } => {
  if (!enabled) return { text: input, unwrapped: 0 };
  const lines = input.split("\n");
  const output: string[] = [];
  let i = 0;
  let unwrapped = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!isFenceLine(line)) {
      output.push(line);
      i += 1;
      continue;
    }
    const info = getFenceInfo(line);
    let j = i + 1;
    const blockLines: string[] = [];
    while (j < lines.length && !isFenceLine(lines[j])) {
      blockLines.push(lines[j]);
      j += 1;
    }
    if (j >= lines.length) {
      output.push(line, ...blockLines);
      i = j;
      continue;
    }

    if (info) {
      output.push(line, ...blockLines, lines[j]);
      i = j + 1;
      continue;
    }

    const content = blockLines.join("\n");
    const nonSpace = content.replace(/\s/g, "");
    const letters = content.match(/[A-Za-zА-Яа-яЁё]/g)?.length ?? 0;
    const letterRatio = nonSpace.length ? letters / nonSpace.length : 0;
    const codeTokens =
      (content.match(/[{}[\];]/g)?.length ?? 0) +
      (content.match(/=>/g)?.length ?? 0) +
      (content.match(/:\s*\S/g)?.length ?? 0);
    const hasJsonLike = /[{[]/.test(content) && /:\s*\S/.test(content);

    if (letterRatio >= 0.6 && codeTokens <= 2 && !hasJsonLike) {
      output.push(...blockLines);
      unwrapped += 1;
    } else {
      output.push(line, ...blockLines, lines[j]);
    }
    i = j + 1;
  }

  return { text: output.join("\n"), unwrapped };
};

const wrapTechnicalTokens = (
  input: string
): { text: string; wrapped: number } => {
  const lines = input.split("\n");
  const output: string[] = [];
  let inFence = false;
  let wrapped = 0;

  const urlRe = /https?:\/\/[^\s)]+/g;
  const apiPathRe =
    /(^|[ \t])(?:(GET|POST|PUT|PATCH|DELETE)\s+)?(\/(?:api|v\d+)\/[^\s)`]+(?:\?[^\s)`]+)?)/g;
  const fieldPathRe =
    /\b[A-Za-z_]\w*(?:\[\])?(?:\.[A-Za-z_]\w*(?:\[\])?)+\b/g;
  const enumRe = /\b[A-Z][A-Z0-9]{1,}(?:_[A-Z0-9]+)+\b/g;

  const collectUrlRanges = (segment: string) => {
    const ranges: Array<{ start: number; end: number }> = [];
    let match: RegExpExecArray | null;
    while ((match = urlRe.exec(segment))) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
    return ranges;
  };

  const overlaps = (
    range: { start: number; end: number },
    protectedRanges: Array<{ start: number; end: number }>
  ) =>
    protectedRanges.some(
      (protectedRange) =>
        range.start < protectedRange.end && range.end > protectedRange.start
    );

  const selectRanges = (
    ranges: Array<{ start: number; end: number; count: number }>
  ) => {
    const sorted = [...ranges].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - a.end;
    });
    const selected: Array<{ start: number; end: number; count: number }> = [];
    sorted.forEach((range) => {
      const last = selected[selected.length - 1];
      if (!last || range.start >= last.end) {
        selected.push(range);
        return;
      }
      if (range.start === last.start && range.end > last.end) {
        selected[selected.length - 1] = range;
      }
    });
    return selected;
  };

  const wrapSegment = (segment: string) => {
    const urlRanges = collectUrlRanges(segment);
    const candidates: Array<{ start: number; end: number; count: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = apiPathRe.exec(segment))) {
      const prefix = match[1] ?? "";
      const method = match[2];
      const path = match[3];
      const baseIndex = match.index + prefix.length;
      if (method) {
        const methodRange = {
          start: baseIndex,
          end: baseIndex + method.length,
          count: 1,
        };
        if (!overlaps(methodRange, urlRanges)) {
          candidates.push(methodRange);
        }
      }
      const pathStart = baseIndex + (method ? method.length + 1 : 0);
      const pathRange = {
        start: pathStart,
        end: pathStart + path.length,
        count: 1,
      };
      if (!overlaps(pathRange, urlRanges)) {
        candidates.push(pathRange);
      }
    }

    while ((match = fieldPathRe.exec(segment))) {
      const value = match[0];
      if (!value.includes("[]")) continue;
      const range = {
        start: match.index,
        end: match.index + value.length,
        count: 1,
      };
      if (!overlaps(range, urlRanges)) {
        candidates.push(range);
      }
    }

    while ((match = enumRe.exec(segment))) {
      const range = {
        start: match.index,
        end: match.index + match[0].length,
        count: 1,
      };
      if (!overlaps(range, urlRanges)) {
        candidates.push(range);
      }
    }

    const selected = selectRanges(candidates);
    if (selected.length === 0) return segment;

    let result = "";
    let cursor = 0;
    selected.forEach((range) => {
      result += segment.slice(cursor, range.start);
      result += `\`${segment.slice(range.start, range.end)}\``;
      cursor = range.end;
      wrapped += range.count;
    });
    result += segment.slice(cursor);
    return result;
  };

  const separateAdjacentCodeSpans = (line: string) => {
    let result = line;
    let updated = true;
    while (updated) {
      const next = result.replace(/`([^`]+)``([^`]+)`/g, "`$1` `$2`");
      updated = next !== result;
      result = next;
    }
    return result;
  };

  const processLine = (line: string) => {
    const wrapped = line
      .split(/(`[^`]*`)/)
      .map((segment, index) => (index % 2 === 1 ? segment : wrapSegment(segment)))
      .join("");
    return separateAdjacentCodeSpans(wrapped);
  };

  lines.forEach((line) => {
    if (isFenceLine(line)) {
      inFence = !inFence;
      output.push(line);
      return;
    }
    if (inFence) {
      output.push(line);
      return;
    }
    output.push(processLine(line));
  });

  return { text: output.join("\n"), wrapped };
};

const restructureProcessBlocks = (
  input: string,
  enabled: boolean
): { text: string; restructured: number } => {
  if (!enabled) return { text: input, restructured: 0 };
  const lines = input.split("\n");
  const output: string[] = [];
  let restructured = 0;
  let i = 0;

  const isHeaderRowLine = (line: string) =>
    !!splitPseudoRow(line) && !isMarkdownHeading(line);
  const isNumbered = (line: string) => /^\s*\d+[.)]\s+/.test(line);
  const isBullet = (line: string) => /^\s*-\s+/.test(line);

  while (i < lines.length) {
    const line = lines[i];
    if (!isHeaderRowLine(line)) {
      output.push(line);
      i += 1;
      continue;
    }
    const block: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== "") {
      block.push(lines[j]);
      j += 1;
    }
    const numbered = block.filter(isNumbered);
    const bullets = block.filter(isBullet);
    const onlyLists =
      block.length > 0 && block.every((item) => isNumbered(item) || isBullet(item));
    if (onlyLists && numbered.length >= 2 && bullets.length >= 2) {
      output.push("**Process**");
      output.push(...numbered);
      output.push("");
      output.push("**Requirements**");
      output.push(...bullets);
      output.push("");
      restructured += 1;
      i = j + 1;
      continue;
    }
    output.push(line, ...block);
    if (j < lines.length) output.push(lines[j]);
    i = j + 1;
  }

  return { text: output.join("\n"), restructured };
};

const detectFenceLanguage = (block: string) => {
  const trimmed = block.trim();
  if (!trimmed) return "text";
  if (/^\s*\/\/|\s*\/\*/m.test(block)) return "text";
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "text";
    }
  }
  return "text";
};

const wrapRequestResponseBlocks = (input: string) => {
  const lines = input.split("\n");
  const output: string[] = [];
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isFenceLine(line)) {
      inFence = !inFence;
      output.push(line);
      i += 1;
      continue;
    }
    if (inFence) {
      output.push(line);
      i += 1;
      continue;
    }

    if (!isRequestResponseMarker(line)) {
      output.push(line);
      i += 1;
      continue;
    }

    output.push(line.trim());
    if (isFenceLine(lines[i + 1] ?? "")) {
      i += 1;
      continue;
    }

    const blockLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const current = lines[j];
      if (!current || current.trim() === "") break;
      if (isFenceLine(current)) break;
      if (isMarkdownHeading(current)) break;
      if (isRequestResponseMarker(current)) break;
      blockLines.push(current);
      j += 1;
    }

    if (blockLines.length > 0) {
      const blockText = blockLines.join("\n");
      const language = detectFenceLanguage(blockText);
      output.push(`\`\`\`${language}`);
      output.push(...blockLines);
      output.push("```");
    }

    i = j;
  }

  return output.join("\n");
};

export const runCustomPreprocess = (
  input: string,
  options: PreprocessOptions
): PreprocessResult => {
  const warnings: string[] = [];

  const attachmentResult = removeAttachmentArtifacts(input);
  let working = attachmentResult.text;

  const promotionResult = promotePseudoHeadings(working, options);
  working = promotionResult.text;
  if (promotionResult.promoted > 0) {
    warnings.push(`Promoted ${promotionResult.promoted} pseudo-headings`);
  }

  const tableResult = convertPseudoTables(working, options);
  working = tableResult.text;
  if (tableResult.converted > 0) {
    warnings.push(
      `Converted ${tableResult.converted} pseudo-tables to Markdown tables`
    );
  }

  const unwrappedResult = unwrapAccidentalFences(
    working,
    options.unwrapAccidentalFences
  );
  working = unwrappedResult.text;
  if (unwrappedResult.unwrapped > 0) {
    warnings.push(
      `Unwrapped ${unwrappedResult.unwrapped} accidental fenced blocks`
    );
  }

  const restructureResult = restructureProcessBlocks(
    working,
    options.restructureProcessBlocks
  );
  working = restructureResult.text;
  if (restructureResult.restructured > 0) {
    warnings.push(
      `Restructured ${restructureResult.restructured} process blocks`
    );
  }

  working = wrapRequestResponseBlocks(working);

  const wrapResult = wrapTechnicalTokens(working);
  working = wrapResult.text;
  if (wrapResult.wrapped > 0) {
    warnings.push(
      `Wrapped ${wrapResult.wrapped} technical tokens in inline code`
    );
  }

  return { text: working, warnings };
};
