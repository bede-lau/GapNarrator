import { scoreNarration } from "@/lib/scoring";
import { computeSilentGaps, findCandidateGapsForEvent } from "@/lib/timeline";
import type {
  DemoScenario,
  NarrationCandidate,
  ScheduledNarration,
} from "@/types";

export function getScenarioEvent(scenario: DemoScenario) {
  return scenario.visualEvents[0];
}

export function getScenarioGaps(scenario: DemoScenario) {
  return computeSilentGaps(scenario.dialogue);
}

export function getScenarioGap(scenario: DemoScenario) {
  const event = getScenarioEvent(scenario);
  const gaps = getScenarioGaps(scenario);
  return findCandidateGapsForEvent(event, gaps)[0] ?? gaps[0];
}

export function scheduleNaiveNarration(
  scenario: DemoScenario
): ScheduledNarration {
  const event = getScenarioEvent(scenario);
  const gap = getScenarioGap(scenario);
  const start = Number((gap.start + 0.15).toFixed(2));
  const estimatedSeconds = Math.max(4.2, Number((gap.duration + 1.6).toFixed(2)));

  return {
    id: `${scenario.id}-ad-naive`,
    text: event.naiveDescription,
    start,
    end: Number((start + estimatedSeconds).toFixed(2)),
    estimatedSeconds,
    gapId: gap.id,
    mode: "naive",
  };
}

export function scheduleFixedNarration(
  scenario: DemoScenario,
  candidate: NarrationCandidate = scenario.fallbackCandidates[0]
): ScheduledNarration {
  const gap = getScenarioGap(scenario);
  const start = Number((gap.start + 0.15).toFixed(2));
  const end = Number((start + candidate.estimatedSeconds).toFixed(2));

  return {
    id: `${scenario.id}-ad-fixed`,
    text: candidate.text,
    start,
    end,
    estimatedSeconds: candidate.estimatedSeconds,
    gapId: gap.id,
    mode: "fixed",
  };
}

export function scoreNaiveScenario(scenario: DemoScenario) {
  return scoreNarration(
    scheduleNaiveNarration(scenario),
    getScenarioGap(scenario),
    getScenarioEvent(scenario)
  );
}

export function scoreFixedCandidate(
  scenario: DemoScenario,
  candidate: NarrationCandidate
) {
  return scoreNarration(
    scheduleFixedNarration(scenario, candidate),
    getScenarioGap(scenario),
    getScenarioEvent(scenario)
  );
}
