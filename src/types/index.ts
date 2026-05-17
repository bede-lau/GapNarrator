export type DialogueSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type VisualEvent = {
  id: string;
  start: number;
  end: number;
  revealAfter: number;
  importance: "low" | "medium" | "critical";
  description: string;
  naiveDescription: string;
  expectedCompressedDescription: string;
};

export type DemoScenario = {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  videoSrc: string;
  fixedVideoSrc?: string;
  duration: number;
  playbackStart: number;
  playbackEnd: number;
  source: {
    title: string;
    url: string;
    license: string;
  };
  dialogue: readonly DialogueSegment[];
  visualEvents: readonly VisualEvent[];
  fallbackCandidates: readonly NarrationCandidate[];
};

export type UploadSilentGap = {
  start: number;
  end: number;
  duration: number;
};

export type VideoAnalysisResult = {
  source: "openai" | "fallback";
  reason?: string;
  selectedGap: UploadSilentGap;
  analysis: {
    title: string;
    eventDescription: string;
    eventStart: number;
    eventEnd: number;
    naiveDescription: string;
    compressedDescription: string;
    candidates: NarrationCandidate[];
  };
};

export type SilentGap = {
  id: string;
  start: number;
  end: number;
  duration: number;
  previousDialogueId?: string;
  nextDialogueId?: string;
};

export type NarrationCandidate = {
  text: string;
  estimatedSeconds: number;
  rationale?: string;
};

export type ScheduledNarration = {
  id: string;
  text: string;
  start: number;
  end: number;
  estimatedSeconds: number;
  gapId: string;
  mode: "naive" | "fixed";
};

export type ScoreBreakdown = {
  gapFit: number;
  noOverlap: number;
  coverage: number;
  spoilerSafe: number;
  finalScore: number;
  pass: boolean;
};

export type DemoMode = "idle" | "naive" | "running" | "fixed";
