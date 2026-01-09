import type { AssistantAction } from "@/platform/storage/types";

export type PanelView = "assistant" | "history" | "none";

export const DEFAULT_ACTION: AssistantAction = "lint";
export const DEFAULT_PANEL_VIEW: PanelView = "assistant";
export const DEFAULT_DOC_TITLE = "New Product Doc";
