import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import type {
  BlockContent,
  Heading,
  ListItem,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
  TableRow,
} from "mdast";
import type { PrepareTextOptions, TableMode } from "./types";

const FILE_NAME_RE =
  /^[^\n\\/]+?\.(png|jpe?g|webp)(?:\s*\(\d+\))?$/i;

type CleanOptions = Required<
  Pick<
    PrepareTextOptions,
    | "maxHeadingDepth"
    | "tableMode"
    | "dedupeHeadings"
    | "dropArtifacts"
    | "dropNoiseLines"
  >
>;

type RemovalStats = {
  removedAttachmentArtifacts: number;
  removedEmptyHeadings: number;
  removedEmptySections: number;
  collapsedDuplicateHeadings: number;
  convertedTables: number;
  removedEmptyBlocks: number;
};

type Section = {
  heading: Heading | null;
  headingText: string;
  headingDepth: number | null;
  content: RootContent[];
};

const normalizeText = (input: string) =>
  input.replace(/\s+/g, " ").trim();

const isAttachmentArtifactLine = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (FILE_NAME_RE.test(trimmed)) return true;
  if (/^[\uFFFC]+$/.test(trimmed)) return true;
  return false;
};

const shouldDropLine = (
  text: string,
  options: CleanOptions,
  stats: RemovalStats
) => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (options.dropArtifacts && isAttachmentArtifactLine(trimmed)) {
    stats.removedAttachmentArtifacts += 1;
    return "artifact" as const;
  }

  return null;
};

const stripSectionMarkers = (
  value: string,
  options: CleanOptions,
  stats: RemovalStats
) => {
  return value;
};

const getNodeText = (node: RootContent): string => {
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode") return node.value;
  if (node.type === "code") return node.value;
  if (node.type === "image") return node.alt || "";
  if ("children" in node && Array.isArray(node.children)) {
    return (node.children as RootContent[]).map(getNodeText).join(" ");
  }
  return "";
};

const getNodesText = (nodes: RootContent[]) =>
  normalizeText(nodes.map(getNodeText).join(" "));

const cleanInlineNodes = (
  nodes: PhrasingContent[],
  options: CleanOptions,
  stats: RemovalStats
): PhrasingContent[] => {
  const output: PhrasingContent[] = [];
  nodes.forEach((node) => {
    if (node.type === "text") {
      const cleanedValue = stripSectionMarkers(node.value, options, stats);
      if (cleanedValue.trim()) {
        output.push({ ...node, value: cleanedValue });
      }
      return;
    }
    if ("children" in node && Array.isArray(node.children)) {
      const cleanedChildren = cleanInlineNodes(
        node.children as PhrasingContent[],
        options,
        stats
      );
      if (cleanedChildren.length > 0) {
        output.push({ ...node, children: cleanedChildren } as PhrasingContent);
      }
      return;
    }
    output.push(node);
  });
  return output;
};

const cleanNode = (
  node: RootContent,
  options: CleanOptions,
  stats: RemovalStats
): RootContent | RootContent[] | null => {
  if (node.type === "table") {
    if (options.tableMode === "kv") {
      const kvBlocks = tableToKeyValueBlocks(node, options.tableMode);
      if (kvBlocks) {
        stats.convertedTables += 1;
        return kvBlocks;
      }
    }

    const cleanedRows = node.children.map((row) =>
      cleanTableRow(row, options, stats)
    );
    return { ...node, children: cleanedRows };
  }

  if (node.type === "tableRow") {
    return cleanTableRow(node, options, stats);
  }

  if (node.type === "tableCell") {
    return cleanTableCell(node, options, stats);
  }

  if (node.type === "heading") {
    const cleanedChildren = cleanInlineNodes(
      node.children as PhrasingContent[],
      options,
      stats
    );
    const text = normalizeText(cleanedChildren.map(getNodeText).join(" "));
    if (!text) {
      stats.removedEmptyHeadings += 1;
      return null;
    }
    if (shouldDropLine(text, options, stats)) {
      return null;
    }
    return { ...node, children: cleanedChildren };
  }

  if (node.type === "paragraph") {
    const cleanedChildren = cleanInlineNodes(
      node.children as PhrasingContent[],
      options,
      stats
    );
    const text = normalizeText(cleanedChildren.map(getNodeText).join(" "));
    if (!text) {
      stats.removedEmptyBlocks += 1;
      return null;
    }
    if (shouldDropLine(text, options, stats)) {
      return null;
    }
    return { ...node, children: cleanedChildren };
  }

  if (node.type === "list") {
    const cleanedItems = node.children
      .map((child) => cleanListItem(child, options, stats))
      .filter(Boolean) as ListItem[];
    if (cleanedItems.length === 0) {
      stats.removedEmptyBlocks += 1;
      return null;
    }
    return { ...node, children: cleanedItems };
  }

  if (node.type === "listItem") {
    return cleanListItem(node, options, stats);
  }

  if ("children" in node && Array.isArray(node.children)) {
    if (node.type === "blockquote" || node.type === "footnoteDefinition") {
      const cleanedChildren = (node.children as RootContent[])
        .map((child) => cleanNode(child, options, stats))
        .flat()
        .filter(isNotNull)
        .filter(isBlockContent);
      if (cleanedChildren.length === 0) {
        return null;
      }
      return { ...node, children: cleanedChildren };
    }

    if (
      node.type === "link" ||
      node.type === "linkReference" ||
      node.type === "emphasis" ||
      node.type === "strong" ||
      node.type === "delete"
    ) {
      const cleanedChildren = cleanInlineNodes(
        node.children as PhrasingContent[],
        options,
        stats
      );
      if (cleanedChildren.length === 0) {
        return null;
      }
      return { ...node, children: cleanedChildren };
    }
  }

  return node;
};

const isNotNull = <T>(value: T | null): value is T => value !== null;

const isBlockContent = (node: RootContent): node is BlockContent => {
  switch (node.type) {
    case "blockquote":
    case "code":
    case "heading":
    case "html":
    case "list":
    case "paragraph":
    case "table":
    case "thematicBreak":
      return true;
    default:
      return false;
  }
};

const isListItemChild = (
  node: RootContent
): node is ListItem["children"][number] => {
  switch (node.type) {
    case "blockquote":
    case "code":
    case "heading":
    case "html":
    case "list":
    case "paragraph":
    case "table":
    case "thematicBreak":
    case "definition":
    case "footnoteDefinition":
      return true;
    default:
      return false;
  }
};

const cleanListItem = (
  node: ListItem,
  options: CleanOptions,
  stats: RemovalStats
): ListItem | null => {
  const cleanedChildren = node.children
    .map((child) => cleanNode(child as RootContent, options, stats))
    .flat()
    .filter(isNotNull)
    .filter(isListItemChild);
  if (cleanedChildren.length === 0) {
    stats.removedEmptyBlocks += 1;
    return null;
  }
  const text = getNodesText(cleanedChildren);
  if (shouldDropLine(text, options, stats)) {
    return null;
  }
  return { ...node, children: cleanedChildren };
};

const cleanTableRow = (
  row: TableRow,
  options: CleanOptions,
  stats: RemovalStats
): TableRow => ({
  ...row,
  children: row.children.map((cell) =>
    cleanTableCell(cell, options, stats)
  ),
});

const cleanTableCell = (
  cell: TableCell,
  options: CleanOptions,
  stats: RemovalStats
): TableCell => {
  const cleanedChildren = (cell.children as PhrasingContent[])
    .map((child) => {
      if (child.type === "text") {
        const cleanedValue = stripSectionMarkers(child.value, options, stats);
        if (!cleanedValue.trim()) {
          return null;
        }
        return { ...child, value: cleanedValue };
      }
      return child;
    })
    .filter(Boolean) as PhrasingContent[];

  return { ...cell, children: cleanedChildren };
};

const tableToKeyValueBlocks = (
  table: Table,
  mode: TableMode
): RootContent[] | null => {
  if (mode !== "kv") return null;
  const rows = table.children;
  if (!rows || rows.length === 0) return null;

  const columnCount = Math.max(
    ...rows.map((row) => row.children.length),
    0
  );
  if (columnCount === 0) return null;

  const hasHeader = rows.length > 1;
  const headerRow = rows[0];
  const headerCells = headerRow.children.map((cell) =>
    normalizeText(getNodeText(cell))
  );

  const lines: string[] = [];

  if (columnCount === 2) {
    const startIndex = hasHeader ? 1 : 0;
    rows.slice(startIndex).forEach((row) => {
      const key = normalizeText(getNodeText(row.children[0]));
      const value = normalizeText(getNodeText(row.children[1]));
      if (!key && !value) return;
      if (key && value) {
        lines.push(`${key}: ${value}`);
      } else if (key) {
        lines.push(`${key}:`);
      } else {
        lines.push(value);
      }
    });
  } else if (hasHeader) {
    const headers = headerCells.map((header, index) =>
      header || `Column ${index + 1}`
    );
    rows.slice(1).forEach((row) => {
      const pairs = headers.map((header, index) => {
        const value = normalizeText(getNodeText(row.children[index]));
        return `${header}: ${value}`.trim();
      });
      const line = pairs.join("; ").trim();
      if (line) lines.push(line);
    });
  } else {
    return null;
  }

  if (lines.length === 0) return null;

  return lines.map((line) => ({
    type: "paragraph",
    children: [{ type: "text", value: line }],
  }));
};

const splitSections = (children: RootContent[]): Section[] => {
  const sections: Section[] = [
    { heading: null, headingText: "", headingDepth: null, content: [] },
  ];
  let current = sections[0];

  children.forEach((node) => {
    if (node.type === "heading") {
      const headingText = normalizeText(getNodeText(node));
      current = {
        heading: node as Heading,
        headingText,
        headingDepth: node.depth,
        content: [],
      };
      sections.push(current);
    } else {
      current.content.push(node);
    }
  });

  return sections;
};

const mergeEmptyHeadings = (
  sections: Section[],
  stats: RemovalStats
): Section[] => {
  const output: Section[] = [];

  sections.forEach((section) => {
    if (section.heading && !section.headingText) {
      stats.removedEmptyHeadings += 1;
      if (output.length > 0) {
        output[output.length - 1].content.push(...section.content);
      } else {
        output.push({
          heading: null,
          headingText: "",
          headingDepth: null,
          content: [...section.content],
        });
      }
      return;
    }
    output.push(section);
  });

  return output;
};

const removeEmptySections = (
  sections: Section[],
  stats: RemovalStats
): Section[] => {
  const output: Section[] = [];

  sections.forEach((section, index) => {
    const contentText = getNodesText(section.content);
    if (!section.heading && !contentText) {
      return;
    }
    if (section.heading && !contentText) {
      const next = sections[index + 1];
      if (
        next?.headingDepth &&
        section.headingDepth &&
        next.headingDepth > section.headingDepth
      ) {
        output.push(section);
        return;
      }
      stats.removedEmptySections += 1;
      return;
    }
    output.push(section);
  });

  return output;
};

const normalizeHeadingKey = (text: string) =>
  normalizeText(text).toLowerCase();

const getSectionFingerprint = (section: Section) =>
  normalizeText(getNodesText(section.content));

const dedupeSections = (
  sections: Section[],
  stats: RemovalStats,
  enabled: boolean
): Section[] => {
  if (!enabled) return sections;
  const output: Section[] = [];

  sections.forEach((section) => {
    if (!section.heading) {
      output.push(section);
      return;
    }

    const previous = output[output.length - 1];
    if (previous?.heading) {
      const prevKey = normalizeHeadingKey(previous.headingText);
      const currKey = normalizeHeadingKey(section.headingText);
      if (
        prevKey &&
        currKey &&
        prevKey === currKey &&
        previous.headingDepth === section.headingDepth
      ) {
        const prevFingerprint = getSectionFingerprint(previous);
        const currFingerprint = getSectionFingerprint(section);

        if (prevFingerprint && prevFingerprint === currFingerprint) {
          stats.collapsedDuplicateHeadings += 1;
          return;
        }

        previous.content.push(...section.content);
        stats.collapsedDuplicateHeadings += 1;
        return;
      }
    }

    output.push(section);
  });

  return output;
};

const rebuildChildren = (sections: Section[]): RootContent[] => {
  const children: RootContent[] = [];
  sections.forEach((section) => {
    if (section.heading) children.push(section.heading);
    children.push(...section.content);
  });
  return children;
};

const buildWarnings = (stats: RemovalStats) => {
  const warnings: string[] = [];
  if (stats.removedAttachmentArtifacts > 0) {
    warnings.push(
      `Removed ${stats.removedAttachmentArtifacts} attachment artifacts`
    );
  }
  if (stats.removedEmptyHeadings > 0) {
    warnings.push(`Removed ${stats.removedEmptyHeadings} empty headings`);
  }
  if (stats.removedEmptySections > 0) {
    warnings.push(`Removed ${stats.removedEmptySections} empty sections`);
  }
  if (stats.removedEmptyBlocks > 0) {
    warnings.push(`Removed ${stats.removedEmptyBlocks} empty blocks`);
  }
  if (stats.collapsedDuplicateHeadings > 0) {
    warnings.push(
      `Collapsed ${stats.collapsedDuplicateHeadings} duplicate headings`
    );
  }
  if (stats.convertedTables > 0) {
    warnings.push(
      `Converted ${stats.convertedTables} tables to key-value blocks`
    );
  }
  return warnings;
};

export const parseMarkdown = (md: string): Root =>
  unified().use(remarkParse).use(remarkGfm).parse(md) as Root;

export const toMarkdown = (ast: Root): string =>
  unified()
    .use(remarkStringify, {
      bullet: "-",
      fence: "`",
      listItemIndent: "one",
    })
    .use(remarkGfm)
    .stringify(ast);

export const buildOutline = (
  ast: Root,
  options: Pick<PrepareTextOptions, "maxHeadingDepth">
): string[] => {
  const maxDepth = options.maxHeadingDepth ?? 6;
  const outline: string[] = [];

  const visit = (nodes: RootContent[]) => {
    nodes.forEach((node) => {
      if (node.type === "heading" && node.depth <= maxDepth) {
        const title = normalizeText(getNodeText(node));
        if (title) outline.push(title);
      }
      if ("children" in node && Array.isArray(node.children)) {
        visit(node.children as RootContent[]);
      }
    });
  };

  visit(ast.children);
  return outline;
};

export const cleanAst = (
  ast: Root,
  options: CleanOptions
): { ast: Root; warnings: string[] } => {
  const stats: RemovalStats = {
    removedAttachmentArtifacts: 0,
    removedEmptyHeadings: 0,
    removedEmptySections: 0,
    collapsedDuplicateHeadings: 0,
    convertedTables: 0,
    removedEmptyBlocks: 0,
  };

  const cleanedChildren = ast.children
    .map((child) => cleanNode(child, options, stats))
    .flat()
    .filter(Boolean) as RootContent[];

  const sections = splitSections(cleanedChildren);
  const mergedSections = mergeEmptyHeadings(sections, stats);
  const trimmedSections = removeEmptySections(mergedSections, stats);
  const dedupedSections = dedupeSections(
    trimmedSections,
    stats,
    options.dedupeHeadings
  );

  const nextAst: Root = {
    ...ast,
    children: rebuildChildren(dedupedSections),
  };

  return { ast: nextAst, warnings: buildWarnings(stats) };
};
