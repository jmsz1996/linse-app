import Link from "next/link";
import { Aperture, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Aperture
        aria-hidden
        strokeWidth={0.5}
        className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 text-foreground/[0.035]"
      />

      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2 text-muted-foreground animate-rise">
          <Aperture className="h-5 w-5" />
          <span className="eyebrow">linse</span>
        </div>

        <h1
          className="font-display text-5xl leading-[1.05] animate-rise"
          style={{ animationDelay: "60ms" }}
        >
          Photo sharing for the people in the room.
        </h1>
        <p
          className="mt-4 text-[15px] leading-relaxed text-muted-foreground animate-rise"
          style={{ animationDelay: "110ms" }}
        >
          Guests join with a name, share what they captured, and watch one shared feed
          come together — no apps, no accounts. Self-hosted, yours to keep.
        </p>

        <Link
          href="/admin"
          className="group mt-9 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-soft transition active:scale-95 animate-rise"
          style={{ animationDelay: "160ms" }}
        >
          Host sign in
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
