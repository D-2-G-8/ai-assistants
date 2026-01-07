import { useEffect } from "react";

export const useAutosave = (
  enabled: boolean,
  onSave: () => void,
  delayMs = 500
) => {
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => onSave(), delayMs);
    return () => clearTimeout(timer);
  }, [enabled, onSave, delayMs]);
};
