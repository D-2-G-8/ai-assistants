# Text Preparation Pipeline

The text preparation pipeline cleans and normalizes HTML, markdown, or plain text
before sending it to the linting model. It produces:

- cleanedText: normalized markdown
- outline: headings only (depth-limited)
- stats: character/line counts and a rough token estimate
- warnings: notes about removals and conversions

## prepareText() usage

```ts
import { prepareText } from "@/shared/lib/text-prep";

const result = prepareText(inputText, {
  maxHeadingDepth: 4,
  tableMode: "kv",
  dedupeHeadings: true,
  dropArtifacts: true,
  dropNoiseLines: true,
  maxChars: 120000,
});

console.log(result.cleanedText);
console.log(result.outline);
```

## POST /api/prepare-text

Request:

```json
{
  "text": "string",
  "options": {
    "maxHeadingDepth": 4,
    "tableMode": "keep",
    "dedupeHeadings": true,
    "dropArtifacts": true,
    "dropNoiseLines": true,
    "maxChars": 120000
  }
}
```

Response:

```json
{
  "cleanedText": "string",
  "outline": ["..."],
  "stats": { "chars": 0, "lines": 0, "approxTokens": 0 },
  "warnings": ["..."]
}
```

## Options

- maxHeadingDepth: 1..6 (defaults to 4)
- tableMode: "keep" or "kv" (defaults to "keep")
- dedupeHeadings: collapse consecutive duplicate headings
- dropArtifacts: remove SECTION markers, image-size lines, and single markers
- dropNoiseLines: remove short punctuation-only lines
- maxChars: truncate input before processing (default 120000)

## Warnings

Warnings are added whenever the pipeline removes or collapses content, for example:

- Removed N SECTION markers
- Removed N image-size lines
- Removed N single-marker lines
- Removed N noise lines
- Removed N empty headings
- Removed N empty sections
- Removed N empty blocks
- Collapsed N duplicate headings
- Converted M tables to key-value blocks
- Truncated input to MAX chars
