import { runCustomPreprocess } from "./preprocess/custom";
import type { PreprocessOptions } from "./preprocess/custom";

export const preprocessMarkdown = (
  input: string,
  options: PreprocessOptions
) => runCustomPreprocess(input, options);
