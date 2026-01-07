import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareText } from "./index";

const fixturesDir = path.join(__dirname, "__fixtures__");
const rawSample = readFileSync(
  path.join(fixturesDir, "sample-raw.txt"),
  "utf8"
);
const htmlSample = readFileSync(
  path.join(fixturesDir, "sample-html.html"),
  "utf8"
);
const messySample = readFileSync(
  path.join(fixturesDir, "messy-doc.txt"),
  "utf8"
);
const messyRuSample = readFileSync(
  path.join(fixturesDir, "messy-ru.txt"),
  "utf8"
);
const messyGenericSample = readFileSync(
  path.join(fixturesDir, "messy-generic.txt"),
  "utf8"
);
const messyVerticalSample = readFileSync(
  path.join(fixturesDir, "messy-vertical-table.txt"),
  "utf8"
);
const falsePositiveSample = readFileSync(
  path.join(fixturesDir, "false-positive-guards.txt"),
  "utf8"
);
const verticalTwoRowsSample = readFileSync(
  path.join(fixturesDir, "vertical-table-2rows.txt"),
  "utf8"
);
const apiStanzaSample = readFileSync(
  path.join(fixturesDir, "api-stanza-and-enum.txt"),
  "utf8"
);
const partialTableSample = readFileSync(
  path.join(fixturesDir, "partial-table-should-abort.txt"),
  "utf8"
);
const verticalChooserSample = readFileSync(
  path.join(fixturesDir, "vertical-k-chooser.txt"),
  "utf8"
);
const noContentLossSample = readFileSync(
  path.join(fixturesDir, "regression-no-content-loss.txt"),
  "utf8"
);
const smallErrorsSample = readFileSync(
  path.join(fixturesDir, "small-errors-vertical-table.txt"),
  "utf8"
);
const largeMappingSample = readFileSync(
  path.join(fixturesDir, "large-mapping-should-not-convert.txt"),
  "utf8"
);
const merchantRegressionSample = readFileSync(
  path.join(fixturesDir, "merchant-portal-regression.raw.txt"),
  "utf8"
);
const merchantContextLossSample = readFileSync(
  path.join(fixturesDir, "merchant-portal-context-line-loss.raw.txt"),
  "utf8"
);
const merchantAttachmentsSample = readFileSync(
  path.join(fixturesDir, "merchant-portal-attachments-and-text.raw.txt"),
  "utf8"
);
const merchantLargeMappingSample = readFileSync(
  path.join(fixturesDir, "merchant-portal-large-mapping.raw.txt"),
  "utf8"
);
const sanitizeInputSample = readFileSync(
  path.join(fixturesDir, "input.raw.txt"),
  "utf8"
);
const sanitizeOutputExpected = readFileSync(
  path.join(fixturesDir, "output.sanitized.md"),
  "utf8"
);

describe("prepareText", () => {
  it("builds outline only from headings", () => {
    const result = prepareText(rawSample, {
      dedupeHeadings: true,
      dropArtifacts: true,
    });

    expect(result.outline).toContain("Document Title");
    expect(result.outline).toContain("Overview");
    expect(result.outline).toContain("Details");
    expect(result.outline).not.toContain("enum {");
    expect(result.outline).not.toContain("delivery.status");
    expect(result.outline).not.toContain("№");
    expect(result.outline).not.toContain("TODO this is not a heading.");
  });

  it("keeps markdown tables in keep mode", () => {
    const result = prepareText(rawSample, { tableMode: "keep" });
    expect(result.cleanedText).toMatch(/\|\s*Key\s*\|\s*Value\s*\|/);
    expect(result.cleanedText).toMatch(/\|\s*Owner\s*\|\s*Team A\s*\|/);
    expect(result.cleanedText).toMatch(/\|\s*Status\s*\|\s*Draft\s*\|/);
  });

  it("collapses duplicate headings when dedupeHeadings is enabled", () => {
    const result = prepareText(rawSample, { dedupeHeadings: true });
    const overviewCount = result.outline.filter(
      (item) => item === "Overview"
    ).length;
    expect(overviewCount).toBe(1);
  });

  it("handles HTML input", () => {
    const result = prepareText(htmlSample, { tableMode: "keep" });
    expect(result.outline).toContain("HTML Sample");
    expect(result.outline).toContain("Section One");
    expect(result.cleanedText).toMatch(/\|\s*Owner\s*\|\s*Team A\s*\|/);
  });

  it("promotes pseudo headings, converts pseudo tables, and unwraps fences", () => {
    const result = prepareText(messySample, { tableMode: "keep" });

    expect(result.outline).toContain("First Section");
    expect(result.outline).toContain("Nested Topic");
    expect(result.outline).toContain("Table Title");
    expect(result.outline).toContain("Summary Table");

    expect(result.cleanedText).toMatch(/\|\s*Name\s*\|\s*Type\s*\|\s*Value\s*\|/);
    expect(result.cleanedText).toMatch(
      /\|\s*Alpha\s*\|\s*Text\s*\|\s*Sample one\s*\|/
    );

    expect(result.cleanedText).toContain(
      "This fenced block is plain language."
    );
    expect(result.cleanedText).not.toContain("```");

    expect(result.cleanedText).toMatch(/`\s*GET\s*`/);
    expect(result.cleanedText).toMatch(/`\s*\/api\/orders\s*`/);
    expect(result.cleanedText).toMatch(/`\s*content\[\]\.supply\.status\s*`/);
    expect(result.cleanedText).toMatch(/`\s*READY_4_SHIPMENT\s*`/);

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Promoted"),
        expect.stringContaining("Wrapped"),
        expect.stringContaining("Markdown tables"),
      ])
    );
  });

  it("keeps URLs intact and wraps full field paths", () => {
    const result = prepareText(messyRuSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain("## Контекст");
    expect(result.cleanedText).toContain('## Метод "Получить список заказов"');
    expect(result.outline).toContain("Контекст");
    expect(result.outline).toContain('Метод "Получить список заказов"');

    expect(result.cleanedText).toContain(
      "https://oms-master-search-service.k8s-stage.ladadigit.io/swagger-ui"
    );
    expect(result.cleanedText).not.toContain("https\\:/");

    expect(result.cleanedText).toMatch(
      /`\s*content\[\]\.supply\.statusHistory\[\]\.timestamp\s*`/
    );
    expect(result.cleanedText).toMatch(
      /`\s*content\[\]\.delivery\.containers\[\]\.items\[\]\.quantity\s*`/
    );
    expect(result.cleanedText).not.toMatch(/statusHistory`\\\[]/);

    expect(result.cleanedText).toContain(
      "1. Список данных, которые возвращаются в ответе."
    );
    expect(result.cleanedText).not.toContain("```");

    expect(result.cleanedText).toMatch(
      /\|\s*Поле источника\s*\|\s*Поле назначения\s*\|\s*Тип\s*\|/
    );
    expect(result.cleanedText).toMatch(/\|\s*orderId\s*\|\s*id\s*\|\s*string\s*\|/);
  });

  it("promotes numbered headings, preserves URLs, and wraps tokens safely", () => {
    const result = prepareText(messyGenericSample, { tableMode: "keep" });

    expect(result.cleanedText).toMatch(/^##\s+Section A/m);
    expect(result.cleanedText).toMatch(/^##\s+Section B/m);
    expect(result.cleanedText).toMatch(/^###\s+Subsection/m);
    expect(result.outline.length).toBeGreaterThan(0);
    expect(result.outline).toContain("Section A");
    expect(result.outline).toContain("Section B");

    expect(result.cleanedText).toContain("https://example.com/path");
    expect(result.cleanedText).not.toContain("https\\:/");

    expect(result.cleanedText).toMatch(/`\s*\/v1\/example\s*`/);
    expect(result.cleanedText).toMatch(/`\s*\/api\/example\s*`/);

    expect(result.cleanedText).toMatch(/`\s*IN_DELIVERY\s*`/);
    expect(result.cleanedText).not.toContain("IN\\_DELIVERY");

    expect(result.cleanedText).toMatch(/`\s*content\[\]\.items\[\]\.id\s*`/);
    expect(result.cleanedText).not.toMatch(/items`\\\[]/);

    expect(result.cleanedText).toContain(
      "This is a plain-language line that should not be fenced."
    );
    expect(result.cleanedText).not.toMatch(
      /```[\s\S]*This is a plain-language line/
    );

    expect(result.cleanedText).toMatch(
      /\|\s*Header One\s*\|\s*Header Two\s*\|\s*Header Three\s*\|/
    );
    expect(result.cleanedText).toMatch(/\|\s*Alpha\s*\|\s*One\s*\|\s*10\s*\|/);
  });

  it("converts vertical tables and promotes headings without trailing blank lines", () => {
    const result = prepareText(messyVerticalSample, { tableMode: "keep" });

    expect(result.cleanedText).toMatch(/^##\s+Section A/m);
    expect(result.cleanedText).toMatch(/^##\s+Section B/m);
    expect(result.outline).toContain("Section A");
    expect(result.outline).toContain("Section B");

    expect(result.cleanedText).toMatch(/\|\s*Col A\s*\|\s*Col B\s*\|\s*Col C\s*\|/);
    expect(result.cleanedText).toMatch(/\|\s*A1\s*\|\s*B1\s*\|\s*C1\s*\|/);

    expect(result.cleanedText).toContain("https://example.com/path");
    expect(result.cleanedText).not.toContain("https\\:/");
    expect(result.cleanedText).toMatch(/`\s*\/v1\/example\s*`/);
    expect(result.cleanedText).toMatch(/`\s*\/api\/example\s*`/);
    expect(result.cleanedText).toMatch(/`\s*IN_DELIVERY\s*`/);
    expect(result.cleanedText).toMatch(/`\s*content\[\]\.items\[\]\.id\s*`/);

    expect(result.cleanedText).not.toMatch(
      /```[\s\S]*This is a plain-language line/
    );
  });

  it("avoids false positives and keeps enum-like blocks intact", () => {
    const result = prepareText(falsePositiveSample, { tableMode: "keep" });

    expect(result.cleanedText).not.toContain("Extracted Table");
    expect(result.cleanedText).toContain("enum {");
    expect(result.outline).not.toContain("enum {");
    expect(result.cleanedText).toContain("https://example.com/path");
    expect(result.cleanedText).not.toContain("https\\:/");
  });

  it("skips api stanzas and enum blocks during table conversion", () => {
    const result = prepareText(apiStanzaSample, { tableMode: "keep" });

    expect(result.cleanedText).not.toContain("Extracted Table");
    expect(result.cleanedText).toContain("enum {");
    expect(result.outline).not.toContain("enum {");
    expect(result.cleanedText).toContain("https://example.com/path");
    expect(result.cleanedText).toContain("`/api/example`");
  });

  it("aborts partial table conversion when row widths mismatch", () => {
    const result = prepareText(partialTableSample, { tableMode: "keep" });

    expect(result.cleanedText).not.toContain("Extracted Table");
    expect(result.cleanedText).toContain("Col A");
    expect(result.cleanedText).toContain("Trailing paragraph text");
  });

  it("converts vertical tables with two rows into markdown tables", () => {
    const result = prepareText(verticalTwoRowsSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain("### Table Title");
    expect(result.cleanedText).toMatch(/\|\s*Col A\s*\|\s*Col B\s*\|\s*Col C\s*\|/);
    expect(result.cleanedText).toMatch(/\|\s*A1\s*\|\s*B1\s*\|\s*C1\s*\|/);
    expect(result.cleanedText).toMatch(/\|\s*A2\s*\|\s*B2\s*\|\s*C2\s*\|/);
  });

  it("chooses the correct vertical table width and leaves cell streams untouched", () => {
    const result = prepareText(verticalChooserSample, { tableMode: "keep" });

    const tableCount =
      result.cleanedText.match(/\|\s*Col A\s*\|\s*Col B\s*\|/g)?.length ?? 0;
    expect(tableCount).toBe(1);
    expect(result.cleanedText).toMatch(/\|\s*A1\s*\|\s*B1\s*\|\s*C1\s*\|\s*D1\s*\|/);
    expect(result.cleanedText).toContain("Stream A");
  });

  it("preserves normal sentences while removing attachment artifacts", () => {
    const result = prepareText(noContentLossSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain(
      "Эта строка — обычный абзац с пунктуацией. Она НЕ ДОЛЖНА исчезнуть после препроцессинга."
    );
    expect(result.cleanedText).toContain(
      "Сразу после вложения идёт обычный текст — он тоже НЕ ДОЛЖЕН исчезнуть."
    );
    expect(result.cleanedText).not.toContain("attachment_mock (1).png");
    expect(result.cleanedText).not.toContain("313.2 KB");
    expect(result.cleanedText).not.toContain("￼");
  });

  it("converts a small vertical errors table and keeps following text", () => {
    const result = prepareText(smallErrorsSample, { tableMode: "keep" });

    expect(result.cleanedText).toMatch(
      /\|\s*Описание\s*\|\s*Код входящий\s*\|\s*Код исходящий\s*\|/
    );
    expect(result.cleanedText).toMatch(
      /\|\s*Сервис А не отвечает\s*\|\s*500\s*\|\s*503 - временно недоступно\s*\|/
    );
    expect(result.cleanedText).toContain("После таблицы снова обычный текст.");
  });

  it("does not convert large mapping blocks into extracted tables", () => {
    const result = prepareText(largeMappingSample, { tableMode: "keep" });

    expect(result.cleanedText).not.toContain("### Extracted Table");
    expect(result.cleanedText).not.toContain("- Row 1");
    expect(result.cleanedText).toContain("content[].items[].id");
    expect(result.cleanedText).toContain("IN_DELIVERY");
    expect(result.cleanedText).toContain("{ \"key\": \"value\"");
  });

  it("handles merchant portal regression fixture", () => {
    const result = prepareText(merchantRegressionSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain(
      "Данные требования описывают функциональность публичного API, предназначенного для сторонних систем (например, ERP, учетных систем продавца) для автоматизации управления заказом."
    );
    expect(result.cleanedText).toContain('## Метод " Получить список заказов"');
    expect(result.cleanedText).toContain("https://example.com/path");
    expect(result.cleanedText).not.toContain("https\\:/");
    expect(result.cleanedText).toContain("`/v1/aggregated-supplies`");
    expect(result.cleanedText).toContain(
      "`/api/stl/location-repo/v1/warehouses/serch`"
    );
    expect(result.cleanedText).toContain("`IN_DELIVERY`");
    expect(result.cleanedText).not.toContain("### Extracted Table");
    expect(result.cleanedText).not.toContain("- Row 1");
    expect(result.cleanedText).toMatch(
      /\|\s*Описание\s*\|\s*Вх\. ошибка\s*\|\s*Исх\. ошибка\s*\|/
    );
    expect(result.cleanedText).not.toContain("Черновик_with_overlays (4).png");
    expect(result.cleanedText).not.toContain("313.2 KB");
  });

  it("keeps the context sentence in minimal merchant fixture", () => {
    const result = prepareText(merchantContextLossSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain(
      "Данные требования описывают функциональность публичного API, предназначенного для сторонних систем (например, ERP, учетных систем продавца) для автоматизации управления заказом."
    );
  });

  it("removes attachment artifacts but keeps adjacent text", () => {
    const result = prepareText(merchantAttachmentsSample, { tableMode: "keep" });

    expect(result.cleanedText).toContain("Текст до вложения должен остаться.");
    expect(result.cleanedText).toContain(
      "Текст сразу после вложения тоже должен остаться."
    );
    expect(result.cleanedText).toContain("Ещё одна обычная строка.");
    expect(result.cleanedText).not.toContain("Черновик_with_overlays (4).png");
    expect(result.cleanedText).not.toContain("313.2 KB");
    expect(result.cleanedText).not.toContain("￼");
  });

  it("does not convert merchant large mapping into extracted table", () => {
    const result = prepareText(merchantLargeMappingSample, { tableMode: "keep" });

    expect(result.cleanedText).not.toContain("### Extracted Table");
    expect(result.cleanedText).toContain("content[].supply.id");
    expect(result.cleanedText).toContain("`IN_DELIVERY`");
    expect(result.cleanedText).toMatch(/`\s*\/v1\/aggregated-supplies\s*`/);
  });

  it("sanitizes raw input to expected markdown", () => {
    const result = prepareText(sanitizeInputSample, { tableMode: "keep" });
    expect(result.cleanedText.trim()).toBe(sanitizeOutputExpected.trim());
  });
});
