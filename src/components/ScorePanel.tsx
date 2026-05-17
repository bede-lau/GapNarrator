import type {
  DemoMode,
  ScoreBreakdown,
  ScheduledNarration,
  SilentGap,
} from "@/types";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Timer, Volume2 } from "lucide-react";

type ScorePanelProps = {
  mode: DemoMode;
  gap: SilentGap;
  naiveNarration: ScheduledNarration;
  fixedNarration: ScheduledNarration;
  naiveScore: ScoreBreakdown;
  fixedScore: ScoreBreakdown;
};

function ResultPill({ pass }: { pass: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.06em]",
        pass
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      )}
    >
      {pass ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : (
        <AlertTriangle size={14} aria-hidden="true" />
      )}
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "cyan";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border p-4",
        tone === "red" && "border-red-100 bg-red-50",
        tone === "green" && "border-emerald-100 bg-emerald-50",
        tone === "cyan" && "border-blue-100 bg-blue-50",
        !tone && "border-zinc-200 bg-white"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

export default function ScorePanel({
  mode,
  gap,
  naiveNarration,
  fixedNarration,
  naiveScore,
  fixedScore,
}: ScorePanelProps) {
  const activeScore = mode === "fixed" ? fixedScore : naiveScore;
  const activeNarration = mode === "fixed" ? fixedNarration : naiveNarration;
  const activeLabel =
    mode === "fixed"
      ? "Fixed accessibility score"
      : mode === "running"
        ? "Compression ready"
        : "Naive accessibility score";
  const verdict =
    mode === "fixed"
      ? "PASS: narration ends before dialogue returns."
      : "FAIL: narration collides with the next dialogue line.";

  return (
    <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-500">Score panel</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
            {activeLabel}
          </h2>
        </div>
        <ResultPill pass={activeScore.pass} />
      </div>

      <div className="mt-5 grid gap-3">
        <Metric label="Available gap" value={`${gap.duration.toFixed(1)}s`} tone="cyan" />
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Naive line"
            value={`${naiveNarration.estimatedSeconds.toFixed(1)}s`}
            tone="red"
          />
          <Metric
            label="Fixed line"
            value={`${fixedNarration.estimatedSeconds.toFixed(1)}s`}
            tone="green"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-zinc-600">
            <Timer size={16} aria-hidden="true" />
            Gap fit
          </span>
          <span className="font-semibold text-zinc-950">
            {activeScore.gapFit ? "fits" : "too long"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-zinc-600">
            <Volume2 size={16} aria-hidden="true" />
            Dialogue overlap
          </span>
          <span className="font-semibold text-zinc-950">
            {activeScore.noOverlap ? "clear" : "overlaps"}
          </span>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-zinc-500">
            <span>Final score</span>
            <span>{Math.round(activeScore.finalScore * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-200">
            <div
              className={clsx(
                "h-full rounded",
                activeScore.pass ? "bg-emerald-500" : "bg-red-500"
              )}
              style={{ width: `${activeScore.finalScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
        <p
          className={clsx(
            "text-lg font-semibold uppercase tracking-[0.04em]",
            activeScore.pass ? "text-emerald-700" : "text-red-700"
          )}
        >
          {verdict}
        </p>
        <p className="mt-4 font-semibold text-zinc-950">Current timed track</p>
        <p className="mt-2">
          {activeNarration.start.toFixed(2)}s-
          {activeNarration.end.toFixed(2)}s: &quot;{activeNarration.text}&quot;
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.08em] text-zinc-500">
          Gap: {gap.start.toFixed(2)}s-{gap.end.toFixed(2)}s - Overlap status:{" "}
          {activeScore.noOverlap ? "clear" : "overlaps dialogue"}
        </p>
      </div>
    </aside>
  );
}
