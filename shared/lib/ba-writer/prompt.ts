import { readFileSync } from "node:fs";
import path from "node:path";

const PROMPT_PATH = path.join(
  process.cwd(),
  "shared",
  "prompts",
  "ba-writer.system.txt"
);

export const BA_WRITER_SYSTEM_PROMPT = readFileSync(PROMPT_PATH, "utf8");
