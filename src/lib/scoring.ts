import type {
  ScoreBreakdown,
  ScheduledNarration,
  SilentGap,
  VisualEvent,
} from "@/types";

const weights = {
  gapFit: 0.35,
  noOverlap: 0.35,
  coverage: 0.2,
  spoilerSafe: 0.1,
} as const;

type ScoreNarrationOptions = {
  coverage?: 0 | 0.5 | 1;
};

export function scoreNarration(
  narration: ScheduledNarration,
  gap: SilentGap,
  event: VisualEvent,
  options: ScoreNarrationOptions = {}
): ScoreBreakdown {
  const coverage = options.coverage ?? 1;
  const gapFit = narration.estimatedSeconds <= gap.duration ? 1 : 0;
  const noOverlap = narration.end <= gap.end ? 1 : 0;
  const spoilerSafe = narration.start >= event.revealAfter - 0.25 ? 1 : 0;

  const finalScore = Number(
    (
      gapFit * weights.gapFit +
      noOverlap * weights.noOverlap +
      coverage * weights.coverage +
      spoilerSafe * weights.spoilerSafe
    ).toFixed(2)
  );

  return {
    gapFit,
    noOverlap,
    coverage,
    spoilerSafe,
    finalScore,
    pass: finalScore >= 0.8,
  };
}
