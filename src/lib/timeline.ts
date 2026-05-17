import type { DialogueSegment, SilentGap, VisualEvent } from "@/types";

export function computeSilentGaps(
  dialogue: readonly DialogueSegment[]
): SilentGap[] {
  const sorted = [...dialogue].sort((a, b) => a.start - b.start);

  return sorted
    .slice(0, -1)
    .map((segment, index) => {
      const next = sorted[index + 1];
      const start = segment.end;
      const end = next.start;
      const duration = Number((end - start).toFixed(2));

      return {
        id: `gap-${segment.id}-${next.id}`,
        start,
        end,
        duration,
        previousDialogueId: segment.id,
        nextDialogueId: next.id,
      };
    })
    .filter((gap) => gap.duration >= 0.5);
}

export function findCandidateGapsForEvent(
  event: VisualEvent,
  gaps: SilentGap[]
): SilentGap[] {
  return gaps.filter((gap) => {
    const startsAfterReveal = gap.start >= event.revealAfter - 0.15;
    const closeToEvent = gap.start <= event.end + 3;
    return startsAfterReveal && closeToEvent;
  });
}
