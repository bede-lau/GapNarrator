"use client";

import type { DemoMode } from "@/types";
import clsx from "clsx";
import { CheckCircle2, Play } from "lucide-react";

type BeforeAfterControlsProps = {
  mode: DemoMode;
  onPlayNaive: () => void;
  onPlayFixed: () => void;
};

export default function BeforeAfterControls({
  mode,
  onPlayNaive,
  onPlayFixed,
}: BeforeAfterControlsProps) {
  const baseButton =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onPlayNaive}
        className={clsx(
          baseButton,
          mode === "naive"
            ? "border-red-500 bg-red-600 text-white"
            : "border-red-100 bg-white text-red-700 hover:bg-red-50"
        )}
      >
        <Play size={18} aria-hidden="true" />
        Play naive version
      </button>

      <button
        type="button"
        onClick={onPlayFixed}
        className={clsx(
          baseButton,
          mode === "fixed"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50"
        )}
      >
        <CheckCircle2 size={18} aria-hidden="true" />
        Play fixed version
      </button>
    </div>
  );
}
