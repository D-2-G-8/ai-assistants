# BA Copilot: Project Overview

Architecture details live in docs/architecture.md.

BA Copilot is a Next.js App Router application that provides a Confluence-style
editor with AI-assisted linting. It is designed to help business analysts and
product teams review requirements, catch ambiguities, and ask clarifying
questions before implementation.

This document explains what is implemented, how the system works end-to-end,
and how to use and extend it.

## Goals

- Provide a lightweight, local-first editor for BA documents.
- Generate structured issues/questions using LLMs (OpenRouter).
- Keep sensitive keys server-side (never on the client).
- Clean and normalize pasted HTML/Markdown/plain text from tools like Confluence.

## Architecture Summary

The app consists of three main layers:

1. **Editor + UI**
   - Rich editor with inline highlights and a right-side issue panel.
   - Local storage for document persistence (MVP).
   - A dev sanitize preview page for checking text preparation.

2. **Text Preparation Pipeline (server-side + shared)**
   - Detects HTML vs. text.
   - Sanitizes HTML.
   - Converts HTML to Markdown.
   - Parses Markdown into AST.
   - Cleans and normalizes AST.
   - Builds a strict outline from headings only.

3. **Lint API Route**
   - App Router route handler that calls OpenRouter with a prompt built from
     the cleaned document and outline.
   - Validates request/response with Zod.
   - Enforces response caps (max issues/questions).


## Text Preparation Pipeline

Located in `lib/text-prep/`.

Stages:

1. **Detect HTML**
   - `looksLikeHtml()` checks if input is HTML-ish.

2. **Sanitize HTML**
   - `sanitize-html` removes unsafe tags and attributes.

3. **HTML -> Markdown**
   - `turndown` converts to Markdown with table and list rules.

4. **Normalize Markdown**
   - Line endings normalized.
   - Extra spaces trimmed.
   - List formatting normalized.
   - Blank lines collapsed.

5. **AST Cleaning (unified/remark)**
   - Parses Markdown into `mdast`.
   - Drops artifacts like `[[SECTION:...]]`, single markers (`№`), and
     attachment lines.
   - Drops noise-only lines.
   - Removes empty headings and empty sections.
   - Dedupe identical headings/sections.
   - Converts GFM tables to key-value blocks when `tableMode="kv"`.
   - Builds outline strictly from heading nodes (no heuristics).

6. **Result Stats**
   - `chars`, `lines`, and `approxTokens` for prompt sizing.
   - Warnings include removals and conversions.

## Prompt Construction

Logic lives in `shared/lib/document/prompt.ts`:

- `prepareText()` is the single canonical cleaning pipeline.
- `docTitle` is resolved from:
  1) explicit request title (unless placeholder),
  2) first non-generic outline entry,
  3) first meaningful line in cleaned text,
  4) fallback to "Untitled Document".
- Prompt sections:
  - Title
  - Document outline (bulleted)
  - Document body
  - Optional Q&A context

## Storage Model

Document data is stored in `localStorage` for the MVP via `shared/lib/document/storage.ts`.
This keeps the UI fast and avoids requiring a DB during early iteration.

## Editor & UI

Main UI pieces:

- `platform/editor/tiptap/Editor.tsx`: Rich editor with highlights.
- `platform/assistant-runtime/ui/ba-reviewer/FindingsList.tsx`: Shows findings/questions and severity.
- `platform/assistant-runtime/ui/ba-reviewer/ReviewerTopBar.tsx`: Controls for save/run check.
- `features/document/SanitizeDev.tsx`: Dev preview for prepareText output.

## Configuration & Environment

Required env vars:

```
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Notes:
- `OPENROUTER_API_KEY` is read only on the server.
- Client never receives the key.

## Testing

Test framework:
- Vitest in Node environment.

Current tests:

- `lib/text-prep/prepareText.test.ts`:
  - outline only from headings
  - artifact removal
  - table conversion
  - duplicate heading collapse
  - HTML handling

- `tests/api-lint.route.test.ts`:
  - Calls `POST` handler directly (no server).
  - Mocks OpenRouter.
  - Writes `tests/artifacts/api-lint.debug.json` with prompt/result details.

Run:
```
npm test
```

## Development Workflow

1. Install deps:
   ```
   npm install
   ```
2. Start dev server:
   ```
   npm run dev
   ```
3. Open:
   ```
   http://localhost:3000
   ```
4. Use `/app/dev/sanitize` to preview text preparation.

## Folder Guide

- `app/`
  - Next.js App Router pages and route handlers.
- `platform/`
  - Core platform modules (assistant runtime, artifacts, editor, storage).
- `features/`
  - Feature-focused UI (document editor shell, findings).
- `shared/`
  - Shared utilities and UI primitives.
- `lib/`
  - Server-side and shared helpers.
  - `text-prep/` is the canonical text cleaning pipeline.
- `tests/`
  - API and fixture tests.
- `docs/`
  - Project and pipeline documentation.

## Design Principles

- Prefer well-known libraries over custom heuristics.
- Keep the prompt deterministic and minimal.
- Ensure outline is derived only from explicit headings.
- Never leak OpenRouter keys to the client.
💡 If you need deeper technical details, see `docs/text-prep.md` for the
pipeline-specific rules and configuration options.
