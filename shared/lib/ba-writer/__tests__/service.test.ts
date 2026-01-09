import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runBaWriter, BaWriterError } from "@/shared/lib/ba-writer/service";
import { callOpenRouter } from "@/shared/lib/ai/openrouter";

vi.mock("@/shared/lib/ai/openrouter", () => ({
  callOpenRouter: vi.fn(),
}));

const fixturesDir = path.join(__dirname, "fixtures");
const notesBasic = readFileSync(
  path.join(fixturesDir, "notes.basic.txt"),
  "utf8"
);
const llmValid = readFileSync(
  path.join(fixturesDir, "llm.valid.json"),
  "utf8"
);
const llmInvalid = readFileSync(
  path.join(fixturesDir, "llm.invalid.json"),
  "utf8"
);

const mockedCallOpenRouter = vi.mocked(callOpenRouter);

const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_MODEL;

const restoreEnv = () => {
  if (originalApiKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  }

  if (originalModel === undefined) {
    delete process.env.OPENROUTER_MODEL;
  } else {
    process.env.OPENROUTER_MODEL = originalModel;
  }
};

beforeEach(() => {
  mockedCallOpenRouter.mockReset();
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL = "test-model";
});

afterEach(() => {
  restoreEnv();
});

describe("runBaWriter", () => {
  it("returns validated JSON on success", async () => {
    mockedCallOpenRouter.mockResolvedValue(llmValid);

    const result = await runBaWriter({
      notes: notesBasic,
      title: "Doc Title",
      docMeta: { version: "0.1", status: "Draft" },
    });

    const expected = JSON.parse(llmValid) as unknown;
    expect(result).toEqual(expected);
  });

  it("throws invalid_json for malformed JSON", async () => {
    mockedCallOpenRouter.mockResolvedValue("{ invalid json");

    let error: unknown;
    try {
      await runBaWriter({ notes: notesBasic });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BaWriterError);
    if (error instanceof BaWriterError) {
      expect(error.code).toBe("invalid_json");
    }
  });

  it("throws schema_validation_failed for schema mismatch", async () => {
    mockedCallOpenRouter.mockResolvedValue(llmInvalid);

    let error: unknown;
    try {
      await runBaWriter({ notes: notesBasic });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BaWriterError);
    if (error instanceof BaWriterError) {
      expect(error.code).toBe("schema_validation_failed");
    }
  });
});
