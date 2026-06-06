"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/components/guest/locale-provider";

interface PhotoNavProps {
  prevUrl: string | null;
  nextUrl: string | null;
  children: React.ReactNode;
}

const arrow =
  "hidden sm:flex fixed top-1/2 z-20 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 hover:text-white";

export function PhotoNav({ prevUrl, nextUrl, children }: PhotoNavProps) {
  const router = useRouter();
  const t = useT();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prevUrl) router.push(prevUrl);
      if (e.key === "ArrowRight" && nextUrl) router.push(nextUrl);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevUrl, nextUrl, router]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0 && nextUrl) router.push(nextUrl);
    if (dx > 0 && prevUrl) router.push(prevUrl);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="contents">
      {children}

      {prevUrl && (
        <button type="button" onClick={() => router.push(prevUrl)} className={`${arrow} left-4`} aria-label={t.photo.prevPhoto}>
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {nextUrl && (
        <button type="button" onClick={() => router.push(nextUrl)} className={`${arrow} right-4`} aria-label={t.photo.nextPhoto}>
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
