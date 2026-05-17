"use client";

import type {
  DemoMode,
  DialogueSegment,
  ScheduledNarration,
  SilentGap,
  VisualEvent,
} from "@/types";
import clsx from "clsx";
import { motion } from "framer-motion";

type TimelineProps = {
  duration: number;
  dialogue: readonly DialogueSegment[];
  gap: SilentGap;
  event: VisualEvent;
  naiveNarration: ScheduledNarration;
  fixedNarration: ScheduledNarration;
  playhead: number;
  mode: DemoMode;
};

function leftPercent(seconds: number, duration: number) {
  return `${(seconds / duration) * 100}%`;
}

function widthPercent(start: number, end: number, duration: number) {
  return `${((end - start) / duration) * 100}%`;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </div>
      <div className="relative h-12 rounded-lg border border-zinc-200 bg-zinc-50">
        {children}
      </div>
    </div>
  );
}

export default function Timeline({
  duration,
  dialogue,
  gap,
  event,
  naiveNarration,
  fixedNarration,
  playhead,
  mode,
}: TimelineProps) {
  const playheadVisible = playhead > 0 && playhead <= duration;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-500">Timeline</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
            Dialogue gaps vs. audio-description track
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">
            Silent gap: {gap.duration.toFixed(1)}s
          </span>
          <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700">
            Key reveal: {event.start.toFixed(2)}s
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="relative min-w-[760px] space-y-3">
          {playheadVisible ? (
            <motion.div
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,0.18)]"
              initial={false}
              animate={{ left: leftPercent(playhead, duration) }}
              transition={{ duration: 0.08 }}
            />
          ) : null}

          <Row label="Dialogue">
            {dialogue.map((segment) => (
              <div
                key={segment.id}
                className="absolute top-2 h-8 overflow-hidden rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800"
                style={{
                  left: leftPercent(segment.start, duration),
                  width: widthPercent(segment.start, segment.end, duration),
                }}
                title={segment.text}
              >
                {segment.id.toUpperCase()}
              </div>
            ))}
          </Row>

          <Row label="Gap">
            <div
              className="absolute top-2 flex h-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-semibold text-blue-700"
              style={{
                left: leftPercent(gap.start, duration),
                width: widthPercent(gap.start, gap.end, duration),
              }}
            >
              {gap.duration.toFixed(1)}s
            </div>
          </Row>

          <Row label="Reveal">
            <div
              className="absolute top-1 h-10 rounded-md border border-amber-200 bg-amber-50"
              style={{
                left: leftPercent(event.start, duration),
                width: widthPercent(event.start, event.end, duration),
              }}
            />
            <div
              className="absolute top-0 h-12 w-px bg-amber-500"
              style={{ left: leftPercent(event.revealAfter, duration) }}
            />
          </Row>

          <Row label="Naive AD">
            <div
              className={clsx(
                "absolute top-2 flex h-8 items-center rounded-md bg-red-500 px-2 text-xs font-semibold text-white",
                mode === "fixed" && "opacity-50"
              )}
              style={{
                left: leftPercent(naiveNarration.start, duration),
                width: widthPercent(
                  naiveNarration.start,
                  naiveNarration.end,
                  duration
                ),
              }}
            >
              overlaps next dialogue
            </div>
          </Row>

          <Row label="Fixed AD">
            <div
              className={clsx(
                "absolute top-2 flex h-8 items-center rounded-md bg-emerald-500 px-2 text-xs font-semibold text-white",
                mode === "naive" && "opacity-45"
              )}
              style={{
                left: leftPercent(fixedNarration.start, duration),
                width: widthPercent(
                  fixedNarration.start,
                  fixedNarration.end,
                  duration
                ),
              }}
            >
              fits
            </div>
          </Row>
        </div>
      </div>
    </section>
  );
}
