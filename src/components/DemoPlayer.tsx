"use client";

import BeforeAfterControls from "@/components/BeforeAfterControls";
import NarrationOptions from "@/components/NarrationOptions";
import ScorePanel from "@/components/ScorePanel";
import Timeline from "@/components/Timeline";
import { demoScenarios } from "@/data/demoScenario";
import {
  getScenarioEvent,
  getScenarioGap,
  scheduleFixedNarration,
  scheduleNaiveNarration,
  scoreFixedCandidate,
  scoreNaiveScenario,
} from "@/lib/audioScheduler";
import { estimateSpeechSeconds } from "@/lib/narration";
import type {
  DemoMode,
  DemoScenario,
  NarrationCandidate,
  ScheduledNarration,
  UploadSilentGap,
  VideoAnalysisResult,
} from "@/types";
import clsx from "clsx";
import { Film, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CapturedFrame = {
  time: number;
  dataUrl: string;
};

type UploadState =
  | "idle"
  | "metadata"
  | "frames"
  | "audio"
  | "openai"
  | "ready"
  | "error";

function selectBrowserVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ["Jenny", "Aria", "Samantha", "Ava", "Serena"];

  return (
    voices.find((voice) =>
      preferredNames.some((name) => voice.name.includes(name))
    ) ?? voices.find((voice) => voice.lang.startsWith("en"))
  );
}

function speakWithBrowser(text: string, rate = 0.98) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = selectBrowserVoice();
  utterance.rate = rate;
  utterance.pitch = 0.96;
  utterance.volume = 0.95;
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
}

async function speakNarration(
  text: string,
  rate = 1,
  onAudio?: (audio: HTMLAudioElement) => void
) {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: "cedar",
        instructions:
          "Read as a calm human audio-description narrator. Natural documentary pacing, warm but neutral, no announcer tone, no robotic cadence.",
      }),
    });

    if (!response.ok) {
      throw new Error("TTS route unavailable");
    }

    const blob = await response.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.playbackRate = rate;
    onAudio?.(audio);
    await audio.play();
  } catch {
    speakWithBrowser(text, rate);
  }
}

function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed while waiting for ${eventName}`));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onSuccess);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(eventName, onSuccess, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function readVideoDuration(src: string) {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = src;
  await waitForEvent(video, "loadedmetadata");
  return Number.isFinite(video.duration) ? video.duration : 16;
}

async function captureFrames(src: string, duration: number): Promise<CapturedFrame[]> {
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable.");
  }

  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = src;
  await waitForEvent(video, "loadedmetadata");

  const sampleTimes = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9]
    .map((ratio) => Math.min(duration - 0.25, Math.max(0.2, duration * ratio)))
    .filter((time, index, times) => index === 0 || Math.abs(time - times[index - 1]) > 0.2);

  canvas.width = 640;
  canvas.height = 360;

  const frames: CapturedFrame[] = [];
  for (const time of sampleTimes) {
    video.currentTime = time;
    await waitForEvent(video, "seeked");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      time: Number(time.toFixed(2)),
      dataUrl: canvas.toDataURL("image/jpeg", 0.72),
    });
  }

  return frames;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function detectSilentGaps(file: File, duration: number): Promise<UploadSilentGap[]> {
  try {
    if (file.size > 60 * 1024 * 1024 || duration > 180) {
      throw new Error("Large videos use fallback gap estimation.");
    }

    const audioContext = new AudioContext();
    const buffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSeconds = 0.1;
    const samplesPerWindow = Math.max(1, Math.floor(sampleRate * windowSeconds));
    const windows: { start: number; end: number; rms: number }[] = [];

    for (let offset = 0; offset < channel.length; offset += samplesPerWindow) {
      const end = Math.min(channel.length, offset + samplesPerWindow);
      let sum = 0;
      for (let index = offset; index < end; index += 1) {
        sum += channel[index] * channel[index];
      }
      const rms = Math.sqrt(sum / Math.max(1, end - offset));
      windows.push({
        start: offset / sampleRate,
        end: end / sampleRate,
        rms,
      });
    }

    const threshold = Math.max(0.012, percentile(windows.map((item) => item.rms), 0.38) * 1.45);
    const gaps: UploadSilentGap[] = [];
    let currentStart: number | null = null;
    let currentEnd = 0;

    for (const item of windows) {
      if (item.rms <= threshold) {
        currentStart ??= item.start;
        currentEnd = item.end;
      } else if (currentStart !== null) {
        const gap = {
          start: Number(currentStart.toFixed(2)),
          end: Number(currentEnd.toFixed(2)),
          duration: Number((currentEnd - currentStart).toFixed(2)),
        };
        if (gap.duration >= 1.2) {
          gaps.push(gap);
        }
        currentStart = null;
      }
    }

    if (currentStart !== null) {
      const gap = {
        start: Number(currentStart.toFixed(2)),
        end: Number(currentEnd.toFixed(2)),
        duration: Number((currentEnd - currentStart).toFixed(2)),
      };
      if (gap.duration >= 1.2) {
        gaps.push(gap);
      }
    }

    await audioContext.close();

    return gaps
      .filter((gap) => gap.start > 0.25 && gap.end < duration - 0.25)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 6);
  } catch {
    const start = Math.max(0.6, Number((duration * 0.42).toFixed(2)));
    const end = Math.min(duration - 0.4, Number((start + 3).toFixed(2)));
    return [
      {
        start,
        end,
        duration: Number((end - start).toFixed(2)),
      },
    ];
  }
}

function buildScenarioFromAnalysis(
  file: File,
  videoSrc: string,
  duration: number,
  result: VideoAnalysisResult
): DemoScenario {
  const gap = result.selectedGap;
  const safeGapStart = Math.max(0.15, gap.start);
  const safeGapEnd = Math.min(duration - 0.15, gap.end);
  const beforeEnd = Number(safeGapStart.toFixed(2));
  const afterStart = Number(safeGapEnd.toFixed(2));
  const afterEnd = Number(Math.min(duration, afterStart + 3).toFixed(2));
  const candidates = result.analysis.candidates.length
    ? result.analysis.candidates
    : [
        {
          text: result.analysis.compressedDescription,
          estimatedSeconds: estimateSpeechSeconds(result.analysis.compressedDescription),
          rationale: "Generated as the shortest timing-safe line.",
        },
      ];

  return {
    id: `upload-${file.name}-${Date.now()}`,
    title: result.analysis.title || file.name.replace(/\.[^.]+$/, ""),
    shortTitle: "Upload",
    summary:
      result.source === "openai"
        ? "Uploaded clip analyzed with timed narration and local audio timing."
        : "Uploaded clip analyzed with local timing and fallback narration.",
    videoSrc,
    duration: Number(duration.toFixed(2)),
    playbackStart: Math.max(0, Number((safeGapStart - 2.2).toFixed(2))),
    playbackEnd: Math.min(duration, Number((safeGapEnd + 3.2).toFixed(2))),
    source: {
      title: file.name,
      url: "",
      license: "Uploaded by user",
    },
    dialogue: [
      {
        id: "d1",
        start: Math.max(0, Number((beforeEnd - 3).toFixed(2))),
        end: beforeEnd,
        text: "Dialogue or foreground audio ends before the quiet gap.",
      },
      {
        id: "d2",
        start: afterStart,
        end: afterEnd,
        text: "Dialogue or foreground audio resumes after the gap.",
      },
    ],
    visualEvents: [
      {
        id: "v1",
        start: Number(
          Math.max(safeGapStart, result.analysis.eventStart).toFixed(2)
        ),
        end: Number(
          Math.min(safeGapEnd, Math.max(result.analysis.eventEnd, result.analysis.eventStart + 0.5)).toFixed(2)
        ),
        revealAfter: Number(
          Math.max(safeGapStart, result.analysis.eventStart).toFixed(2)
        ),
        importance: "critical",
        description: result.analysis.eventDescription,
        naiveDescription: result.analysis.naiveDescription,
        expectedCompressedDescription: result.analysis.compressedDescription,
      },
    ],
    fallbackCandidates: candidates,
  };
}

export default function DemoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const narrationStartedRef = useRef(false);
  const uploadedUrlsRef = useRef<string[]>([]);

  const [uploadedScenarios, setUploadedScenarios] = useState<DemoScenario[]>([]);
  const scenarios = useMemo<DemoScenario[]>(
    () => [...uploadedScenarios, ...demoScenarios],
    [uploadedScenarios]
  );
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0].id);
  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0],
    [scenarioId, scenarios]
  );
  const event = useMemo(() => getScenarioEvent(scenario), [scenario]);
  const gap = useMemo(() => getScenarioGap(scenario), [scenario]);
  const naiveNarration = useMemo(
    () => scheduleNaiveNarration(scenario),
    [scenario]
  );
  const naiveScore = useMemo(() => scoreNaiveScenario(scenario), [scenario]);

  const [mode, setMode] = useState<DemoMode>("idle");
  const [playhead, setPlayhead] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [candidates, setCandidates] = useState<NarrationCandidate[]>([
    ...scenario.fallbackCandidates,
  ]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<NarrationCandidate>(scenario.fallbackCandidates[0]);
  const [activeNarration, setActiveNarration] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState(
    "Upload a modern reference clip to create a fresh timing demo."
  );
  const [systemMessage, setSystemMessage] = useState(
    "Upload your own clip or use a sample fallback, then preview the naive timing failure."
  );

  const fixedNarration = useMemo(
    () => scheduleFixedNarration(scenario, selectedCandidate),
    [scenario, selectedCandidate]
  );
  const fixedScore = useMemo(
    () => scoreFixedCandidate(scenario, selectedCandidate),
    [scenario, selectedCandidate]
  );
  const playbackVideoSrc =
    mode === "fixed" && scenario.fixedVideoSrc
      ? scenario.fixedVideoSrc
      : scenario.videoSrc;

  const clearPlayback = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setActiveNarration(null);
    setActiveDialogue(null);
    narrationAudioRef.current?.pause();
    narrationAudioRef.current = null;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  useEffect(() => clearPlayback, [clearPlayback]);

  useEffect(
    () => () => {
      uploadedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const resetScenarioState = useCallback((nextScenario: DemoScenario) => {
    setMode("idle");
    setPlayhead(0);
    setVideoFailed(false);
    setCandidates([...nextScenario.fallbackCandidates]);
    setSelectedCandidate(nextScenario.fallbackCandidates[0]);
  }, []);

  const animatePlayhead = useCallback((
    narration: ScheduledNarration,
    nextMode: "naive" | "fixed"
  ) => {
    const startedAt = performance.now();

    const tick = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const current = Number(
        (
          videoRef.current?.currentTime ??
          scenario.playbackStart + elapsedSeconds
        ).toFixed(2)
      );
      setPlayhead(Math.min(current, scenario.playbackEnd));

      const narrationActive =
        current >= narration.start && current <= narration.end;
      setActiveNarration(narrationActive ? narration.text : null);

      const currentDialogue = scenario.dialogue.find(
        (segment) => current >= segment.start && current <= segment.end
      );
      setActiveDialogue(currentDialogue?.text ?? null);

      const fixedVideoHasNarration =
        nextMode === "fixed" && Boolean(scenario.fixedVideoSrc);

      if (
        !fixedVideoHasNarration &&
        !narrationStartedRef.current &&
        current >= narration.start
      ) {
        narrationStartedRef.current = true;
        void speakNarration(
          narration.text,
          nextMode === "naive" ? 0.92 : 1,
          (audio) => {
            narrationAudioRef.current = audio;
          }
        );
      }

      if (current >= scenario.playbackEnd) {
        videoRef.current?.pause();
        setActiveNarration(null);
        setActiveDialogue(null);
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  }, [
    scenario.dialogue,
    scenario.fixedVideoSrc,
    scenario.playbackEnd,
    scenario.playbackStart,
  ]);

  const startPlayback = useCallback(
    (nextMode: "naive" | "fixed") => {
      clearPlayback();

      const narration =
        nextMode === "naive"
          ? naiveNarration
          : scheduleFixedNarration(scenario, selectedCandidate);

      setMode(nextMode);
      setPlayhead(scenario.playbackStart);
      narrationStartedRef.current = false;
      setSystemMessage(
        nextMode === "naive"
          ? "Naive preview: the correct line is too long and runs into dialogue."
          : "Fixed preview: the video includes the timed audio-description track."
      );

      if (videoRef.current) {
        const targetSrc =
          nextMode === "fixed" && scenario.fixedVideoSrc
            ? scenario.fixedVideoSrc
            : scenario.videoSrc;
        const video = videoRef.current;

        if (!video.currentSrc.endsWith(targetSrc)) {
          video.src = targetSrc;
          video.load();
        }

        const play = () => {
          video.currentTime = scenario.playbackStart;
          video.muted = false;
          video.volume = 0.74;
          void video.play().catch(() => {
            setVideoFailed(true);
          });
        };

        if (video.readyState >= 1) {
          play();
        } else {
          video.addEventListener("loadedmetadata", play, { once: true });
        }
      }

      animatePlayhead(narration, nextMode);
    },
    [
      animatePlayhead,
      clearPlayback,
      naiveNarration,
      scenario,
      selectedCandidate,
    ]
  );

  const selectScenario = useCallback(
    (nextScenario: DemoScenario) => {
      clearPlayback();
      setScenarioId(nextScenario.id);
      resetScenarioState(nextScenario);
      setSystemMessage(`${nextScenario.title}: ${nextScenario.summary}`);
    },
    [clearPlayback, resetScenarioState]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      clearPlayback();
      const url = URL.createObjectURL(file);
      uploadedUrlsRef.current.push(url);

      try {
        if (file.size > 160 * 1024 * 1024) {
          throw new Error("Please upload a clip under 160 MB for this browser demo.");
        }

        setUploadState("metadata");
        setUploadMessage("Reading video metadata.");
        const duration = await readVideoDuration(url);

        if (duration > 240) {
          throw new Error("Please upload a clip under four minutes for real-time analysis.");
        }

        setUploadState("frames");
        setUploadMessage("Sampling frames locally for server-side OpenAI analysis.");
        const frames = await captureFrames(url, duration);

        setUploadState("audio");
        setUploadMessage("Scanning audio locally for low-audio gaps, with fallback if decoding is unavailable.");
        const silentGaps = await detectSilentGaps(file, duration);

        setUploadState("openai");
        setUploadMessage("Sending sampled frames and timing metadata to the server.");
        const response = await fetch("/api/analyze-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            duration,
            frames,
            silentGaps,
          }),
        });

        if (!response.ok) {
          throw new Error("Video analysis route failed.");
        }

        const result = (await response.json()) as VideoAnalysisResult;
        const uploadedScenario = buildScenarioFromAnalysis(file, url, duration, result);

        setUploadedScenarios((current) => [uploadedScenario, ...current].slice(0, 3));
        setScenarioId(uploadedScenario.id);
        resetScenarioState(uploadedScenario);
        setUploadState("ready");
        setSystemMessage(
          result.source === "openai"
            ? "Upload analyzed with local frame sampling and timing scan."
            : `Fallback upload analysis ready: ${result.reason ?? "OpenAI unavailable."}`
        );
        setUploadMessage(
          `Ready: detected ${result.selectedGap.duration.toFixed(1)}s gap and generated candidates.`
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        setUploadState("error");
        setUploadMessage(
          error instanceof Error
            ? error.message
            : "Upload analysis failed. Try a shorter MP4 or MOV clip."
        );
      }
    },
    [clearPlayback, resetScenarioState]
  );

  const overlapActive = mode === "naive" && activeNarration && activeDialogue;
  const uploadBusy = ["metadata", "frames", "audio", "openai"].includes(uploadState);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 bg-white/85 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-stretch">
          <label
            className={clsx(
              "flex min-h-40 cursor-pointer flex-col justify-between rounded-lg border border-dashed p-4 transition",
              uploadBusy
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-blue-300 hover:bg-blue-50/60"
            )}
          >
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={uploadBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  void handleUpload(file);
                }
              }}
            />
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Upload size={18} aria-hidden="true" />
              Upload your video
            </span>
            <span className="mt-5 text-2xl font-semibold tracking-normal">
              {uploadBusy ? "Analyzing..." : "Drop in a modern clip"}
            </span>
            <span className="mt-3 text-sm leading-6 text-zinc-500">
              {uploadMessage}
            </span>
          </label>

          <div className="flex flex-wrap content-start gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            {scenarios.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectScenario(item)}
                className={clsx(
                  "cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400",
                  item.id === scenario.id
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                )}
              >
                {item.shortTitle || `Clip ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
                <Film size={16} aria-hidden="true" />
                {scenario.title}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
                Video preview and timed narration
              </h2>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-black">
            {videoFailed ? (
              <div className="flex aspect-video items-center justify-center bg-zinc-950 p-8 text-center text-sm text-zinc-300">
                Video asset unavailable. The timed audio-description timeline
                remains functional.
              </div>
            ) : (
              <video
                key={playbackVideoSrc}
                ref={videoRef}
                src={playbackVideoSrc}
                className="aspect-video w-full bg-black object-contain"
                controls
                muted={false}
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
              />
            )}

            <div className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white backdrop-blur">
              {mode === "fixed"
                ? "Fixed AD fits"
                : mode === "naive"
                  ? "Naive overlaps"
                  : mode === "running"
                    ? "GapNarrator running"
                    : "Before"}
            </div>

            <div className="absolute bottom-3 left-3 right-3 space-y-2">
              {activeNarration ? (
                <div
                  className={clsx(
                    "rounded-md border px-3 py-2 text-sm font-semibold backdrop-blur",
                    mode === "fixed"
                      ? "border-emerald-300/50 bg-emerald-950/82 text-emerald-50"
                      : "border-red-300/50 bg-red-950/82 text-red-50"
                  )}
                >
                  AD: {activeNarration}
                </div>
              ) : null}
              {activeDialogue ? (
                <div className="rounded-md border border-blue-200/50 bg-blue-950/80 px-3 py-2 text-sm font-semibold text-blue-50 backdrop-blur">
                  Dialogue: {activeDialogue}
                </div>
              ) : null}
              {overlapActive ? (
                <div className="rounded-md border border-red-200 bg-red-500 px-3 py-2 text-sm font-bold uppercase tracking-[0.06em] text-white">
                  Overlap: accessibility failure
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {systemMessage}
            </div>
          </div>

          <div className="mt-4">
            <BeforeAfterControls
              mode={mode}
              onPlayNaive={() => startPlayback("naive")}
              onPlayFixed={() => startPlayback("fixed")}
            />
          </div>
        </div>

        <ScorePanel
          mode={mode}
          gap={gap}
          naiveNarration={naiveNarration}
          fixedNarration={fixedNarration}
          naiveScore={naiveScore}
          fixedScore={fixedScore}
        />
      </section>

      <Timeline
        duration={scenario.duration}
        dialogue={scenario.dialogue}
        gap={gap}
        event={event}
        naiveNarration={naiveNarration}
        fixedNarration={fixedNarration}
        playhead={playhead}
        mode={mode}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <NarrationOptions
          gap={gap}
          naiveNarration={naiveNarration}
          candidates={candidates}
          selectedText={selectedCandidate.text}
          onSelect={(candidate) => {
            setSelectedCandidate(candidate);
            setSystemMessage(`Selected "${candidate.text}" for playback.`);
          }}
        />
      </section>
    </div>
  );
}
