# GapNarrator Full Project Spec

## Project Summary

GapNarrator is a timed audio-description production tool for accessible video. The demo proves that a correct audio description can still be unusable if it does not fit the silent gap between dialogue.

One-liner:
GapNarrator generates timed audio-description tracks for video by finding silent gaps between dialogue, compressing narration to fit, and creating a playable accessibility preview for blind and low-vision viewers.

## Correct Framing

Use:
GapNarrator is a timed audio-description production tool.

Do not use:
AI video analyzer, image analyzer, scene description bot, or video summarizer.

Live explanation:
Most AI tools can describe what is on screen. GapNarrator solves the harder accessibility problem: when can that description be spoken?

## MVP Scenarios

All clips are trimmed from the public-domain Dragnet episode "The Big Phone Call":

```txt
https://archive.org/details/Dragnet_The_Big_Phone_Call
```

### The Tape Recorder

- File: `public/demo/demo-tape-recorder.mp4`
- Gap: `6.0s-9.0s`, 3.0 seconds
- Visual event: A detective reaches for the tape recorder.
- Naive line: "The detective crosses the office and reaches down to start the tape recorder on the desk."
- Fixed line: "He starts the tape."

### The Phone Recording

- File: `public/demo/demo-phone-recording.mp4`
- Gap: `8.0s-11.0s`, 3.0 seconds
- Visual event: The recorder reel spins as the call plays.
- Naive line: "The camera cuts close to the tape machine as the reel turns and the recorded phone call begins."
- Fixed line: "The reel turns."

### The Evidence Cue

- File: `public/demo/demo-evidence-cue.mp4`
- Gap: `6.0s-9.0s`, 3.0 seconds
- Visual event: The officer adjusts the recording equipment.
- Naive line: "The officer turns back toward the recording equipment and adjusts it to cue the next piece of evidence."
- Fixed line: "He cues the tape."

## Product Requirements

Required user flow:
1. User lands on homepage.
2. User selects one of three demo clips.
3. User sees video, timeline, silent gap, and score panel.
4. User clicks "Play naive version."
5. The naive narration overlaps the next dialogue block.
6. User clicks "Run GapNarrator."
7. Candidate compressed lines appear.
8. User clicks "Play fixed version."
9. The fixed narration plays inside the gap.
10. The score panel shows success.

Core features:
- Three local public-domain video clips
- Scenario selector
- Video player
- Timeline view
- Dialogue blocks
- Silent gap detection
- Visual event marker
- Naive narration block
- Fixed narration block
- Narration compression
- TTS narration preview
- Before/after playback
- Scoring/report panel
- Fallback path if API fails

Non-goals:
- Generic upload support before the demo works
- YouTube downloading
- Generic video or image analysis
- Face recognition
- Full video editing suite

## Technical Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- `openai`, `zod`, `lucide-react`, `framer-motion`, `clsx`

Backend routes:
- `POST /api/compress-description`
- `POST /api/tts`

Voice:
- OpenAI TTS defaults to `marin`.
- TTS requests include natural audio-description narrator instructions.
- UI discloses that AI-generated voice may be used.

Fallbacks:
- If OpenAI compression fails, use scenario-specific hardcoded candidate lines.
- If OpenAI TTS fails, use browser `speechSynthesis`.
- If video fails, keep the timeline demo visible with a placeholder.

## Scoring

Weights:
- gapFit: 35%
- noOverlap: 35%
- coverage: 20%
- spoilerSafe: 10%

Pass condition:
Final score must be at least 0.8.

Expected scores:
- naive: fail
- fixed: pass

## Acceptance Criteria

- `npm run dev` works.
- Homepage loads without errors.
- Three demo clips are selectable.
- Each selected video appears.
- Timeline shows dialogue blocks.
- Timeline shows the silent gap.
- Timeline shows the visual event marker.
- Naive narration is visibly longer than the gap.
- Naive playback overlaps dialogue.
- Fixed playback fits the gap.
- Score panel marks naive as fail.
- Score panel marks fixed as pass.
- App can run with OpenAI API.
- App still works if OpenAI API fails.
- No API key appears in frontend code.
- UI copy does not frame the app as an image analyzer.
- Demo can be explained in under 30 seconds.
