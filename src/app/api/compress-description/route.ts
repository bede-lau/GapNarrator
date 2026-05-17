import { demoScenarios, fallbackCandidates } from "@/data/demoScenario";
import { estimateSpeechSeconds } from "@/lib/narration";
import type { NarrationCandidate } from "@/types";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  eventDescription: z.string().min(3),
  availableGapSeconds: z.number().positive().max(30),
  contextBefore: z.string().optional().default(""),
  contextAfter: z.string().optional().default(""),
  maxWords: z.number().int().positive().max(20).optional().default(5),
});

const candidateSchema = z.object({
  text: z.string().min(1),
  estimatedSeconds: z.number().positive(),
  rationale: z.string().optional(),
});

const responseSchema = z.object({
  candidates: z.array(candidateSchema).min(1).max(5),
});

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 20;
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

function pickFallbackCandidates(eventDescription = "") {
  const normalized = eventDescription.toLowerCase();
  const scenario =
    demoScenarios.find((item) =>
      item.visualEvents.some((event) =>
        normalized.includes(event.description.toLowerCase().slice(0, 18))
      )
    ) ??
    demoScenarios.find((item) =>
      item.visualEvents.some((event) =>
        event.description
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 4 && normalized.includes(word))
      )
    );

  return scenario ? [...scenario.fallbackCandidates] : fallbackCandidates;
}

function fallbackResponse(reason: string, status = 200, eventDescription = "") {
  return NextResponse.json(
    {
      candidates: pickFallbackCandidates(eventDescription),
      source: "fallback",
      reason,
    },
    { status }
  );
}

function parseModelJson(text: string): { candidates: NarrationCandidate[] } {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const json = JSON.parse(cleaned) as unknown;
  const parsed = responseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("Model response did not match candidate schema");
  }

  return {
    candidates: parsed.data.candidates.slice(0, 3).map((candidate) => ({
      ...candidate,
      estimatedSeconds: estimateSpeechSeconds(candidate.text),
    })),
  };
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return fallbackResponse("Too many compression requests.", 429);
  }

  if (requestTooLarge(request, 20_000)) {
    return fallbackResponse("Compression request is too large.", 413);
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return fallbackResponse("Invalid request body.", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackResponse(
      "OPENAI_API_KEY is not configured.",
      200,
      parsed.data.eventDescription
    );
  }

  const {
    eventDescription,
    availableGapSeconds,
    contextBefore,
    contextAfter,
    maxWords,
  } = parsed.data;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      instructions:
        "You are an expert audio-description editor for accessible video. Output JSON only. Be objective and concise. Preserve the key action and object. Do not add interpretation beyond the visible action. Do not reveal information before the event occurs.",
      input: `Rewrite the visual event into three short audio-description options that fit a strict silent gap.

Visual event: ${eventDescription}
Available gap seconds: ${availableGapSeconds}
Maximum words: ${maxWords}
Context before: ${contextBefore}
Context after: ${contextAfter}

Return exactly:
{
  "candidates": [
    {
      "text": "...",
      "estimatedSeconds": 1.1,
      "rationale": "..."
    }
  ]
}`,
    });

    const modelText = response.output_text;
    const result = parseModelJson(modelText);

    return NextResponse.json({
      ...result,
      source: "openai",
    });
  } catch {
    return fallbackResponse("OpenAI compression failed.", 200, eventDescription);
  }
}
