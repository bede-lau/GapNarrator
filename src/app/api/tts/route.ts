import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const supportedVoices = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

const requestSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.string().min(1).default("marin"),
  instructions: z.string().max(600).optional(),
});

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 30;
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

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many TTS requests. Try again shortly." },
      { status: 429 }
    );
  }

  if (requestTooLarge(request, 6_000)) {
    return NextResponse.json(
      { error: "TTS request body is too large." },
      { status: 413 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const voice = supportedVoices.has(parsed.data.voice)
      ? parsed.data.voice
      : "marin";
    const speech = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice,
      input: parsed.data.text,
      instructions:
        parsed.data.instructions ??
        "Read as a calm, professional audio-description narrator. Natural, concise, and not robotic.",
      response_format: "mp3",
      speed: 1,
    });

    const audio = await speech.arrayBuffer();

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "OpenAI TTS failed. Use browser speech synthesis fallback." },
      { status: 503 }
    );
  }
}
