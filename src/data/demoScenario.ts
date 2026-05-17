import type { DemoScenario, NarrationCandidate } from "@/types";

const snackSource = {
  title: "Snack Attack",
  url: "",
  license: "User-provided reference clip",
} as const;

const archiveSource = {
  title: "Dragnet: The Big Phone Call",
  url: "https://archive.org/details/Dragnet_The_Big_Phone_Call",
  license: "Public domain",
} as const;

export const demoScenarios = [
  {
    id: "snack-station",
    title: "Station Approach",
    shortTitle: "Station",
    summary: "A traveler hurries through the station before the next beat.",
    videoSrc: "/demo/snack-station-base.mp4",
    fixedVideoSrc: "/demo/snack-station-fixed.mp4",
    duration: 15,
    playbackStart: 0,
    playbackEnd: 15,
    source: snackSource,
    dialogue: [
      {
        id: "d1",
        start: 0.2,
        end: 5.8,
        text: "Foreground audio plays before the station clears.",
      },
      {
        id: "d2",
        start: 9.2,
        end: 14.2,
        text: "Foreground audio resumes after the visual action.",
      },
    ],
    visualEvents: [
      {
        id: "v1",
        start: 6.05,
        end: 8.6,
        revealAfter: 6.05,
        importance: "critical",
        description: "A traveler hurries across the station.",
        naiveDescription:
          "The small traveler rushes across the warm station interior and heads toward the vending area.",
        expectedCompressedDescription: "She hurries across the station.",
      },
    ],
    fallbackCandidates: [
      {
        text: "She hurries across the station.",
        estimatedSeconds: 2.07,
        rationale: "Names the visible action and location within the quiet gap.",
      },
      {
        text: "She crosses the station.",
        estimatedSeconds: 1.69,
        rationale: "Shorter version for tighter timing.",
      },
      {
        text: "She rushes inside.",
        estimatedSeconds: 1.3,
        rationale: "Very compact fallback line.",
      },
    ],
  },
  {
    id: "snack-machine",
    title: "Snack Machine",
    shortTitle: "Snack",
    summary: "The traveler studies the snack machine during a quiet pause.",
    videoSrc: "/demo/snack-machine-base.mp4",
    fixedVideoSrc: "/demo/snack-machine-fixed.mp4",
    duration: 15,
    playbackStart: 0,
    playbackEnd: 15,
    source: snackSource,
    dialogue: [
      {
        id: "d1",
        start: 0.4,
        end: 5.4,
        text: "Foreground audio leads into the machine close-up.",
      },
      {
        id: "d2",
        start: 9.0,
        end: 14.3,
        text: "Foreground audio returns after the pause.",
      },
    ],
    visualEvents: [
      {
        id: "v1",
        start: 5.9,
        end: 8.2,
        revealAfter: 5.9,
        importance: "critical",
        description: "A traveler looks up at the snack machine.",
        naiveDescription:
          "The traveler peers through her glasses at the red snack machine while deciding what to buy.",
        expectedCompressedDescription: "She eyes the snack machine.",
      },
    ],
    fallbackCandidates: [
      {
        text: "She eyes the snack machine.",
        estimatedSeconds: 2.07,
        rationale: "Directly describes the action and object.",
      },
      {
        text: "She studies the snacks.",
        estimatedSeconds: 1.69,
        rationale: "Natural and short enough for the pause.",
      },
      {
        text: "She looks up.",
        estimatedSeconds: 1.3,
        rationale: "Compact line if the gap is tighter.",
      },
    ],
  },
  {
    id: "evidence-cue",
    title: "Evidence Cue",
    shortTitle: "Evidence",
    summary: "The officer cues another recording before the suspect responds.",
    videoSrc: "/demo/demo-evidence-cue.mp4",
    duration: 16,
    playbackStart: 2.8,
    playbackEnd: 14.5,
    source: archiveSource,
    dialogue: [
      {
        id: "d1",
        start: 3.3,
        end: 6.0,
        text: "Won't take very long. Here we are, April fifth.",
      },
      {
        id: "d2",
        start: 9.0,
        end: 13.0,
        text: "A lot of foolishness anyway. How do I know how you made those recordings?",
      },
      {
        id: "d3",
        start: 13.4,
        end: 15.2,
        text: "Keep listening.",
      },
    ],
    visualEvents: [
      {
        id: "v1",
        start: 6.15,
        end: 8.5,
        revealAfter: 6.15,
        importance: "critical",
        description: "The officer adjusts the recording equipment.",
        naiveDescription:
          "The officer turns back toward the recording equipment and adjusts it to cue the next piece of evidence.",
        expectedCompressedDescription: "He cues the tape.",
      },
    ],
    fallbackCandidates: [
      {
        text: "He cues the tape.",
        estimatedSeconds: 1.35,
        rationale: "Captures the action without crowding dialogue.",
      },
      {
        text: "He adjusts the recorder.",
        estimatedSeconds: 1.55,
        rationale: "Objective and still inside the pause.",
      },
      {
        text: "The next tape is ready.",
        estimatedSeconds: 1.75,
        rationale: "Clear, though slightly less direct.",
      },
    ],
  },
] as const satisfies readonly DemoScenario[];

export const demoScenario = demoScenarios[0];
export const fallbackCandidates: NarrationCandidate[] = [
  ...demoScenario.fallbackCandidates,
];
