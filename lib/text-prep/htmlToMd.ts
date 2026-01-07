import TurndownService from "turndown";

const collapseInlineWhitespace = (input: string) =>
  input.replace(/\s+/g, " ").trim();

const escapePipe = (input: string) => input.replace(/\|/g, "\\|");

const formatRow = (cells: string[]) =>
  `| ${cells.map((cell) => escapePipe(cell)).join(" | ")} |`;

const getCellText = (cell: Element) =>
  collapseInlineWhitespace(cell.textContent ?? "");

const normalizeCells = (cells: string[], width: number) => {
  const filled = [...cells];
  while (filled.length < width) filled.push("");
  return filled.slice(0, width);
};

const buildGfmTable = (table: Element) => {
  const headRows = Array.from(table.querySelectorAll("thead tr"));
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  const allRows = Array.from(table.querySelectorAll("tr"));

  const headerRow = headRows[0] ?? allRows[0];
  if (!headerRow) return "";

  const headerCells = Array.from(
    headerRow.querySelectorAll("th, td")
  ).map(getCellText);

  const bodySource = bodyRows.length > 0
    ? bodyRows
    : allRows.filter((row) => row !== headerRow);

  const bodyCells = bodySource.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map(getCellText)
  );

  const colCount = Math.max(
    headerCells.length,
    ...bodyCells.map((row) => row.length),
    1
  );

  const header = normalizeCells(headerCells, colCount);
  const separator = new Array(colCount).fill("---");
  const rows = bodyCells.map((row) => normalizeCells(row, colCount));

  const lines = [
    formatRow(header),
    formatRow(separator),
    ...rows.map(formatRow),
  ];

  return `\n\n${lines.join("\n")}\n\n`;
};

export const htmlToMarkdown = (safeHtml: string): string => {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  turndownService.addRule("links", {
    filter: "a",
    replacement: (content, node) => {
      const href = (node as HTMLElement).getAttribute("href");
      const text = collapseInlineWhitespace(content) || href || "";
      if (!href) return text;
      return `[${text}](${href})`;
    },
  });

  turndownService.addRule("tables", {
    filter: (node) => node.nodeName === "TABLE",
    replacement: (_, node) => buildGfmTable(node as Element),
  });

  turndownService.addRule("dropEmptyContainers", {
    filter: (node) => node.nodeName === "DIV" || node.nodeName === "SPAN",
    replacement: (content) =>
      collapseInlineWhitespace(content) ? content : "",
  });

  return turndownService.turndown(safeHtml);
};
