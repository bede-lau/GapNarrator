import { estimateSpeechSeconds } from "@/lib/narration";
import type { NarrationCandidate } from "@/types";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const frameSchema = z.object({
  time: z.number().min(0),
  dataUrl: z.string().startsWith("data:image/").max(950_000),
});

const gapSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  duration: z.number().positive(),
});

const requestSchema = z.object({
  fileName: z.string().min(1).max(200),
  duration: z.number().positive().max(240),
  frames: z.array(frameSchema).min(1).max(10),
  silentGaps: z.array(gapSchema).max(8),
});

const candidateSchema = z.object({
  text: z.string().min(1).max(80),
  estimatedSeconds: z.number().positive(),
  rationale: z.string().max(240).optional(),
});

const modelSchema = z.object({
  title: z.string().min(1).max(80),
  eventDescription: z.string().min(3).max(180),
  eventStart: z.number().min(0),
  eventEnd: z.number().min(0),
  naiveDescription: z.string().min(8).max(220),
  compressedDescription: z.string().min(2).max(80),
  candidates: z.array(candidateSchema).min(1).max(3),
});

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 8;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

function isRateLimited(request: Request) {
  const key = getClientKey(request);
  const now = Date.now();
  const current = requestCounts.get(key);

  if (!current || current.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  current.count += 1;
  return current.count > maxRequestsPerWindow;
}

function requestTooLarge(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length > maxBytes;
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function selectGap(gaps: z.infer<typeof gapSchema>[], duration: number) {
  const usable = gaps
    .filter((gap) => gap.duration >= 1.4)
    .sort((a, b) => b.duration - a.duration);

  if (usable[0]) {
    return usable[0];
  }

  const start = Math.max(0.5, Number((duration * 0.42).toFixed(2)));
  const end = Math.min(duration - 0.5, Number((start + 3).toFixed(2)));

  return {
    start,
    end,
    duration: Number((end - start).toFixed(2)),
  };
}

function fallbackAnalysis(
  body: z.infer<typeof requestSchema>,
  reason: string,
  status = 200
) {
  const selectedGap = selectGap(body.silentGaps, body.duration);
  const eventStart = Number((selectedGap.start + 0.2).toFixed(2));
  const eventEnd = Number(
    Math.min(selectedGap.end - 0.15, eventStart + 1.2).toFixed(2)
  );
  const candidates: NarrationCandidate[] = [
    {
      text: "The action happens.",
      estimatedSeconds: estimateSpeechSeconds("The action happens."),
      rationale: "Short fallback line for the detected quiet gap.",
    },
    {
      text: "A key detail appears.",
      estimatedSeconds: estimateSpeechSeconds("A key detail appears."),
      rationale: "Neutral fallback when visual analysis is unavailable.",
    },
    {
      text: "The moment is shown.",
      estimatedSeconds: estimateSpeechSeconds("The moment is shown."),
      rationale: "Concise and timing-safe.",
    },
  ];

  return NextResponse.json(
    {
      source: "fallback",
      reason,
      selectedGap,
      analysis: {
        title: body.fileName.replace(/\.[^.]+$/, "") || "Uploaded clip",
        eventDescription: "A key visual action occurs during the quiet gap.",
        eventStart,
        eventEnd,
        naiveDescription:
          "A visible action happens during the pause and needs a timed audio description before dialogue resumes.",
        compressedDescription: candidates[0].text,
        candidates,
      },
    },
    { status }
  );
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many analysis requests. Try again shortly." },
      { status: 429 }
    );
  }

  if (requestTooLarge(request, 9_000_000)) {
    return NextResponse.json(
      { error: "Upload analysis payload is too large." },
      { status: 413 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload analysis request." },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const selectedGap = selectGap(body.silentGaps, body.duration);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnalysis(body, "OPENAI_API_KEY is not configured.");
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const frameSummary = body.frames
      .map((frame, index) => `Frame ${index + 1}: ${frame.time.toFixed(2)}s`)
      .join("\n");
    const gapSummary = body.silentGaps.length
      ? body.silentGaps
          .map(
            (gap) =>
              `${gap.start.toFixed(2)}s-${gap.end.toFixed(2)}s (${gap.duration.toFixed(2)}s)`
          )
          .join(", ")
      : "No confident silent gap detected; use the selected fallback gap.";

    const response = await client.responses.create({
      model: process.env.OPENAI_VIDEO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.2",
      instructions:
        "You are an expert audio-description producer. Analyze sampled video frames and timing metadata to pick one visible action that can be described after it appears and inside a quiet gap. Return JSON only. The output is a timed audio-description track, not a scene summary.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create one GapNarrator scenario from this uploaded video.

File: ${body.fileName}
Duration: ${body.duration.toFixed(2)} seconds
Detected low-audio gaps: ${gapSummary}
Preferred gap: ${selectedGap.start.toFixed(2)}s-${selectedGap.end.toFixed(2)}s (${selectedGap.duration.toFixed(2)}s)
Sampled frames:
${frameSummary}

Pick a concrete visual action that occurs near or inside the preferred gap. Write a naive line that is accurate but too long, then write three compressed audio-description candidates that can fit the preferred gap. Use objective, natural spoken English. If the frames do not clearly show an action, return a conservative fallback action.

Return exactly:
{
  "title": "...",
  "eventDescription": "...",
  "eventStart": 1.23,
  "eventEnd": 2.34,
  "naiveDescription": "...",
  "compressedDescription": "...",
  "candidates": [
    {"text": "...", "estimatedSeconds": 1.1, "rationale": "..."}
  ]
}`,
            },
            ...body.frames.map((frame) => ({
              type: "input_image" as const,
              image_url: frame.dataUrl,
              detail: "low" as const,
            })),
          ],
        },
      ],
    });

    const modelJson = JSON.parse(cleanJson(response.output_text)) as unknown;
    const model = modelSchema.parse(modelJson);
    const candidates = model.candidates.map((candidate) => ({
      ...candidate,
      estimatedSeconds: estimateSpeechSeconds(candidate.text),
    }));

    return NextResponse.json({
      source: "openai",
      selectedGap,
      analysis: {
        ...model,
        candidates,
      },
    });
  } catch {
    return fallbackAnalysis(body, "OpenAI video analysis failed.");
  }
}
