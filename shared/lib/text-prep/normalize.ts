const normalizeLineEndings = (input: string) =>
  input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const normalizeLineSpaces = (
  line: string,
  collapseSpaces: boolean,
  normalizeWhitespace: boolean
) => {
  const safeLine = line.replace(/\u00a0/g, " ").trimEnd();
  if (!collapseSpaces) return safeLine;
  const match = safeLine.match(/^(\s*)(.*)$/);
  if (!match) return safeLine;
  const leading = match[1];
  const rest = normalizeWhitespace
    ? match[2].replace(/[\t ]+/g, " ")
    : match[2].replace(/[ \t]{2,}/g, " ");
  return `${leading}${rest}`;
};

export const collapseBlankLines = (input: string, maxBlankLines = 2) => {
  const lines = input.split("\n");
  const output: string[] = [];
  let blankCount = 0;

  lines.forEach((line) => {
    if (line.trim() === "") {
      blankCount += 1;
      if (blankCount <= maxBlankLines) {
        output.push("");
      }
    } else {
      blankCount = 0;
      output.push(line);
    }
  });

  return output.join("\n");
};

export const normalizeMarkdown = (
  input: string,
  options?: { collapseSpaces?: boolean; formatLists?: boolean; normalizeWhitespace?: boolean }
) => {
  const withLineEndings = normalizeLineEndings(input);
  const lines = withLineEndings.split("\n");
  const output: string[] = [];
  let inFence = false;
  const collapseSpaces = options?.collapseSpaces ?? true;
  const formatLists = options?.formatLists ?? true;
  const normalizeWhitespace = options?.normalizeWhitespace ?? true;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      output.push(line.trimEnd());
      return;
    }

    if (inFence) {
      output.push(line.replace(/\u00a0/g, " ").trimEnd());
      return;
    }

    const normalizedLine = normalizeLineSpaces(
      line,
      collapseSpaces,
      normalizeWhitespace
    );
    const unordered = normalizedLine.match(/^(\s*)([-*+•])\s+/);
    if (unordered) {
      output.push(
        `${unordered[1]}- ${normalizedLine.slice(unordered[0].length).trim()}`
      );
      return;
    }
    const ordered = normalizedLine.match(/^(\s*)(\d+)[.)]\s+/);
    if (ordered) {
      output.push(
        `${ordered[1]}${ordered[2]}. ${normalizedLine
          .slice(ordered[0].length)
          .trim()}`
      );
      return;
    }
    output.push(normalizedLine);
  });

  const formatted = formatLists ? formatListBlocks(output) : output;
  const normalized = normalizeWhitespace
    ? normalizeWhitespaceOutsideFences(formatted.join("\n"))
    : formatted.join("\n");

  return collapseBlankLines(normalized, 2).trim();
};

const formatListBlocks = (lines: string[]) => {
  const formatted: string[] = [];
  let inList = false;
  let inFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      formatted.push(line);
      return;
    }
    if (inFence) {
      formatted.push(line);
      return;
    }

    const listMatch = line.match(/^(\s*)(-|\d+\.)\s+/);
    if (listMatch) {
      if (!inList) {
        formatted.push("");
        inList = true;
      }
      const content = line.slice(listMatch[0].length).trim();
      formatted.push(`${listMatch[1]}${listMatch[2]} ${content}`);
      return;
    }

    if (inList && trimmed.length > 0) {
      formatted.push("");
      inList = false;
    }
    formatted.push(line);
  });

  return formatted;
};

const normalizeWhitespaceOutsideFences = (input: string) => {
  const lines = input.split("\n");
  const output: string[] = [];
  let inFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      output.push(line.trimEnd());
      return;
    }
    if (inFence) {
      output.push(line.trimEnd());
      return;
    }

    const listMatch = line.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1];
      const content = listMatch[3].replace(/[\t ]+/g, " ").trimEnd();
      output.push(`${indent}${listMatch[2]} ${content}`);
      return;
    }

    const normalized = line.replace(/[\t ]+/g, " ").trimEnd();
    output.push(normalized.replace(/^ +/, ""));
  });

  return output.join("\n").trim();
};
