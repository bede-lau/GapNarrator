# GapNarrator

Timed audio-description tracks that fit between dialogue.

GapNarrator is a demo webapp for the accessibility production problem that a correct audio description can still fail if it cannot be spoken inside the available silent gap.

## Demo

The app now includes three public-domain dialogue clips:

- `The Tape Recorder`: 3.0s gap, fixed line `"He starts the tape."`
- `The Phone Recording`: 3.0s gap, fixed line `"The reel turns."`
- `The Evidence Cue`: 3.0s gap, fixed line `"He cues the tape."`

Each demo shows a long naive line that overlaps dialogue, then a compressed timed audio-description track that fits.

## Video Source

All clips are trimmed from the public-domain Dragnet episode "The Big Phone Call":

```txt
https://archive.org/details/Dragnet_The_Big_Phone_Call
```

Local files:

```txt
public/demo/demo-tape-recorder.mp4
public/demo/demo-phone-recording.mp4
public/demo/demo-evidence-cue.mp4
```

## OpenAI Key

The app does not need an OpenAI key to run the demo.

`OPENAI_API_KEY` enables optional server-side services:

- `/api/compress-description`: live candidate rewriting
- `/api/tts`: less robotic AI voice preview using `marin`

Without a key, GapNarrator uses hardcoded fallback candidates and browser speech synthesis.

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Verification

```bash
npm run lint
npm run build
```
