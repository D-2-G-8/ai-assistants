"use client";

import clsx from "clsx";

type AssistantSwitchProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export default function AssistantSwitch({
  active,
  label,
  onClick,
}: AssistantSwitchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-semibold transition",
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  );
}
