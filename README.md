# BA Copilot

Confluence-style document editor with AI lint checks and inline highlights.

## Setup

```bash
npm install
```

Create `.env.local`:

```bash
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Assistant Output Format

The `/api/ba-reviewer` route expects the model to return strict JSON. Each
profile defines its own output schema; the lint profile still uses legacy
`issues/questions` and is normalized into `findings/artifacts` internally.

```json
{
  "findings": [
    {
      "id": "F-001",
      "severity": "error|warn|info",
      "kind": "issue|question|recommendation",
      "message": "what is wrong / question text",
      "suggestion": "how to fix / why it matters",
      "category": "missing|ambiguity|consistency|testability|glossary|scope",
      "anchor": {
        "quote": "short text fragment (if any)",
        "startHint": "where to look (section name or unique phrase)",
        "endHint": "optional"
      }
    }
  ],
  "artifacts": []
}
```

The API validates with Zod. If the model returns invalid JSON, the UI falls back to empty results and reports the error via headers.

## Adding a new AssistantProfile

1. Define a new profile in `platform/assistant-runtime/profiles.ts` (id, docTypes, actions, schemas, UI schema).
2. Add a prompt template in `platform/assistant-runtime/promptTemplates.ts` and include it in `promptTemplates`.
3. Make sure `promptTemplateId`/`promptTemplateVersion` in the profile match the template.
4. The registry resolves profiles by `{ docType, action }`, so UI will pick it automatically once available.

Example: create a `tech-lint` profile by cloning `lintProfile` with `docTypes: ["technical"]` and a new id.

## End-to-End Check

1. Create a new document on the home page.
2. Write a short spec (add headings, lists, and links).
3. Click **Run check**.
4. Confirm that highlights appear in the editor and questions/issues show in the right panel.
5. Answer a question, click **Send**, then **Re-run check**.
6. Edit a highlighted segment and confirm the highlight disappears.
7. Click **Save (Ready)** when blockers are cleared.

## Notes

- Documents and run history are stored in `localStorage` for the MVP.
- OpenRouter keys stay server-side via `/api/ba-reviewer`.
- Text preparation pipeline docs live in `docs/text-prep.md`.
