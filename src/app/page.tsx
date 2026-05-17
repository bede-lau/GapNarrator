import DemoPlayer from "@/components/DemoPlayer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[oklch(0.975_0.006_255)] text-zinc-950">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="max-w-4xl">
            <p className="mb-3 inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Timed audio-description production
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-zinc-950 sm:text-5xl">
              GapNarrator
            </h1>
            <p className="mt-3 max-w-3xl text-xl leading-8 text-zinc-600">
              Upload a clip, detect quiet gaps, and generate a timed
              audio-description track that fits before speech returns.
            </p>
          </div>
        </header>

        <DemoPlayer />

        <footer className="border-t border-zinc-200 py-6 text-sm text-zinc-500">
          <p>The output is not a caption or a scene summary.</p>
          <p className="mt-1 font-medium text-zinc-800">
            It is a timed accessibility track.
          </p>
        </footer>
      </div>
    </main>
  );
}
