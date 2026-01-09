import { readFileSync } from "node:fs";
import path from "node:path";

const PROMPT_PATH = path.join(
  process.cwd(),
  "shared",
  "prompts",
  "ba-reviewer.system.txt"
);

export const BA_REVIEWER_SYSTEM_PROMPT = readFileSync(PROMPT_PATH, "utf8");
