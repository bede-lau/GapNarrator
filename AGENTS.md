# GapNarrator Agent Instructions

## Mission

Build GapNarrator, a polished hackathon webapp that generates timed audio-description tracks for video.

The product must be framed as:
"Timed audio-description production for accessible video."

Do not frame it as:
"AI video analyzer" or "image analyzer."

## Core Demo

The demo uses three short public-domain dialogue clips.

Each clip has human dialogue, a silent gap of about three seconds, and a key
visual action that must be described without covering the next spoken line.

The app must show:
1. A naive audio description that is too long.
2. The silent gap available between dialogue.
3. A compressed narration line that fits.
4. A playable before/after preview.

## Build Priority

Priority 1:
- Static polished demo with hardcoded scenario data.
- Timeline visualization.
- Before/after playback.
- Score panel.

Priority 2:
- OpenAI compression route.
- OpenAI TTS route.

Priority 3:
- Upload form and custom scenario editing.

Do not build generic upload support before the demo is polished.

## Visual Design

The UI should feel like an audio/video editing console.

Use:
- dark background
- waveform/timeline style
- red/failure state
- green/success state
- large readable numbers:
  - "Available gap: 3.0s"
  - "Naive line: 4.6s"
  - "Compressed line: 1.2s"

## Engineering Rules

- Use TypeScript.
- OpenAI API calls must be server-side only.
- Keep scenario data in `src/data/demoScenario.ts`.
- Keep pure functions in `src/lib`.
- Components should be small and readable.
- Always include fallback behavior if API calls fail.

## Required User Flow

1. User lands on homepage.
2. They see the video and timeline.
3. They click "Play naive version."
4. The naive narration overlaps dialogue and the score panel marks failure.
5. They click "Run GapNarrator."
6. Candidate lines appear.
7. The chosen line is scheduled into the silent gap.
8. They click "Play fixed version."
9. The narration fits cleanly.
10. Final report shows pass.

## Hard Rule

The main output is a timed audio-description track, not a visual description.
