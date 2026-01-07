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

## Model Response Format

The `/api/lint` route expects the model to return strict JSON:

```json
{
  "issues": [
    {
      "id": "ISSUE-001",
      "severity": "blocker|warning|suggestion",
      "category": "missing|ambiguity|consistency|testability|glossary|scope",
      "quote": "short text fragment (if any)",
      "message": "what is wrong",
      "fix_suggestion": "how to fix",
      "startHint": "where to look (section name or unique phrase)",
      "endHint": "optional",
      "question": "optional clarifying question"
    }
  ],
  "questions": [
    {
      "id": "Q-001",
      "severity": "blocker|warning",
      "question": "question for BA",
      "reason": "why it matters"
    }
  ]
}
```

The API validates with Zod. If the model returns invalid JSON, the UI safely falls back to empty issues/questions and reports the error via an `x-lint-error` header.

## End-to-End Check

1. Create a new document on the home page.
2. Write a short spec (add headings, lists, and links).
3. Click **Run check**.
4. Confirm that highlights appear in the editor and questions/issues show in the right panel.
5. Answer a question, click **Send**, then **Re-run check**.
6. Edit a highlighted segment and confirm the highlight disappears.
7. Click **Save (Ready)** when blockers are cleared.

## Notes

- Documents are stored in `localStorage` for the MVP.
- OpenRouter keys stay server-side via `/api/lint`.
- Text preparation pipeline docs live in `docs/text-prep.md`.
