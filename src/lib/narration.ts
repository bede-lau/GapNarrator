import type { NarrationCandidate } from "@/types";

export function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Number((words / 2.6 + 0.15).toFixed(2));
}

export function fitsGap(
  estimatedSeconds: number,
  gapDuration: number,
  bufferSeconds = 0.1
): boolean {
  return estimatedSeconds <= gapDuration - bufferSeconds;
}

export function pickBestCandidate(
  candidates: NarrationCandidate[],
  gapDuration: number
): NarrationCandidate {
  return (
    candidates.find((candidate) =>
      fitsGap(candidate.estimatedSeconds, gapDuration)
    ) ?? candidates[0]
  );
}
