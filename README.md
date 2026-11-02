<h1 align="center">GapNarrator</h1>
<p align="center"><b>Timed audio-description production for accessible video.</b></p>

## ▍At a glance

```mermaid
flowchart LR
 A["Dialogue clip + silent gap"] --> B["Candidate description"]
 B --> C["Timing comparison"]
 C --> D["Before / after playback"]
 B -. "optional server-side rewrite" .-> E["Compression API"]
 D -. "optional voice" .-> F["TTS API"]
```

The bundled demo runs without a key, using fixed candidates and browser speech synthesis.

---

Timed audio-description tracks that fit between dialogue.

GapNarrator is a demo webapp for the accessibility production problem that a correct audio description can still fail if it cannot be spoken inside the available silent gap.

## ▍The scheduling pipeline

A visual event needs a description, but that description has to fit the time left between spoken lines. GapNarrator models the timing explicitly: it derives silent gaps from dialogue segments, evaluates candidate narration against a gap, then compares the naïve and fitted schedules.

| Module | Responsibility |
| --- | --- |
| [`src/data/demoScenario.ts`](src/data/demoScenario.ts) | Bundled scenarios, dialogue and event data |
| [`src/lib/timeline.ts`](src/lib/timeline.ts) | Derives silent gaps and finds candidate gaps for an event |
| [`src/lib/narration.ts`](src/lib/narration.ts) | Estimates speech duration, checks fit and chooses candidates |
| [`src/lib/audioScheduler.ts`](src/lib/audioScheduler.ts) | Builds and scores naïve and fitted schedules |
| [`src/lib/scoring.ts`](src/lib/scoring.ts) | Scores narration against the scenario |
| `src/app/api/` | Optional server-side analysis, compression and speech routes |

The speech-duration estimate is an estimate, not a guarantee of actual spoken duration. Listen to the preview and review the timing before treating a track as finished.

---

## Demo

The configured scenarios in [`src/data/demoScenario.ts`](src/data/demoScenario.ts) are:

| Scenario | Visual action | Fitted example |
| --- | --- | --- |
| **Station Approach** | A traveler hurries through a station. | “She hurries across the station.” |
| **Snack Machine** | The traveler studies a snack machine. | “She eyes the snack machine.” |
| **Evidence Cue** | An officer cues recording equipment. | “He cues the tape.” |

Station and Snack use user-provided reference clips and committed base/fixed video files. Evidence Cue uses a clip from [*Dragnet: The Big Phone Call*](https://archive.org/details/Dragnet_The_Big_Phone_Call), identified in the scenario data as public domain. Confirm the rights for any footage before reuse.

Each scenario compares a longer description with a timed alternative. The configured dialogue timings are demonstration inputs; check the audible result before reuse.

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
