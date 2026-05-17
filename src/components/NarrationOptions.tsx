"use client";

import type { NarrationCandidate, ScheduledNarration, SilentGap } from "@/types";
import clsx from "clsx";

type NarrationOptionsProps = {
  gap: SilentGap;
  naiveNarration: ScheduledNarration;
  candidates: NarrationCandidate[];
  selectedText: string;
  onSelect: (candidate: NarrationCandidate) => void;
};

export default function NarrationOptions({
  gap,
  naiveNarration,
  candidates,
  selectedText,
  onSelect,
}: NarrationOptionsProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-500">
            Narration options
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
            Compress to the available silent gap
          </h2>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-red-700">Naive line</p>
          <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            {naiveNarration.estimatedSeconds.toFixed(1)}s FAIL
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          &quot;{naiveNarration.text}&quot;
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {candidates.map((candidate) => {
          const selected = candidate.text === selectedText;
          return (
            <button
              key={candidate.text}
              type="button"
              onClick={() => onSelect(candidate)}
              className={clsx(
                "rounded-lg border p-4 text-left transition",
                selected
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-zinc-950">
                  &quot;{candidate.text}&quot;
                </p>
                <span
                  className={clsx(
                    "rounded-md px-2 py-1 text-xs font-semibold",
                    candidate.estimatedSeconds <= gap.duration
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  )}
                >
                  {candidate.estimatedSeconds.toFixed(1)}s
                </span>
              </div>
              {candidate.rationale ? (
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {candidate.rationale}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
