import type { Artifact, JsonPatchOperation } from "@/platform/artifacts/types";
import { appendBlocksToDoc } from "@/platform/editor/converters/blocksToTiptap";

export type ApplyArtifactResult = {
  content: Record<string, unknown>;
  error?: string;
};

const decodePointerToken = (value: string) =>
  value.replace(/~1/g, "/").replace(/~0/g, "~");

const parsePointer = (path: string) => {
  if (!path) return [];
  if (!path.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${path}`);
  }
  return path
    .slice(1)
    .split("/")
    .map((segment) => decodePointerToken(segment));
};

const getContainer = (root: unknown, tokens: string[]) => {
  let current = root as Record<string, unknown> | unknown[];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    if (Array.isArray(current)) {
      const index = Number(token);
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Invalid array index at ${token}`);
      }
      current = current[index] as Record<string, unknown> | unknown[];
    } else {
      const next = current[token];
      if (next === undefined || next === null) {
        throw new Error(`Missing object path at ${token}`);
      }
      current = next as Record<string, unknown> | unknown[];
    }
  }
  return current;
};

const applyOperation = (doc: unknown, operation: JsonPatchOperation) => {
  const tokens = parsePointer(operation.path);
  const key = tokens[tokens.length - 1];
  const container = tokens.length === 0 ? null : getContainer(doc, tokens);

  if (tokens.length === 0 || key === undefined) {
    throw new Error("JSON Patch must target a path");
  }

  if (Array.isArray(container)) {
    const index = key === "-" ? container.length : Number(key);
    if (Number.isNaN(index)) {
      throw new Error(`Invalid array index ${key}`);
    }

    switch (operation.op) {
      case "add":
        container.splice(index, 0, operation.value);
        return;
      case "replace":
        container[index] = operation.value;
        return;
      case "remove":
        container.splice(index, 1);
        return;
      default:
        throw new Error(`Unsupported op for arrays: ${operation.op}`);
    }
  }

  const obj = container as Record<string, unknown>;
  switch (operation.op) {
    case "add":
    case "replace":
      obj[key] = operation.value;
      return;
    case "remove":
      delete obj[key];
      return;
    default:
      throw new Error(`Unsupported op for objects: ${operation.op}`);
  }
};

const applyJsonPatch = (
  content: Record<string, unknown>,
  patch: JsonPatchOperation[]
) => {
  const clone = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
  patch.forEach((operation) => applyOperation(clone, operation));
  return clone;
};

export const applyArtifactToContent = (
  content: Record<string, unknown>,
  artifact: Artifact
): ApplyArtifactResult => {
  try {
    if (artifact.type === "blocks") {
      return {
        content: appendBlocksToDoc(content, artifact.blocks),
      };
    }
    if (artifact.type === "doc_patch") {
      return {
        content: applyJsonPatch(content, artifact.patch),
      };
    }
    return {
      content,
      error: `Unsupported artifact type ${(artifact as Artifact).type}`,
    };
  } catch (error) {
    return {
      content,
      error: error instanceof Error ? error.message : "Failed to apply artifact",
    };
  }
};
