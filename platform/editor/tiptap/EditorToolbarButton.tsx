"use client";

import clsx from "clsx";

type EditorToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

export default function EditorToolbarButton({
  label,
  active,
  onClick,
}: EditorToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
      )}
    >
      {label}
    </button>
  );
}
