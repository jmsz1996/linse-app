"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/guest/locale-provider";

interface LikeButtonProps {
  photoId: string;
  slug: string;
  initialCount: number;
  initialLiked: boolean;
}

export function LikeButton({ photoId, slug, initialCount, initialLiked }: LikeButtonProps) {
  const t = useT();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  async function toggle() {
    if (isLoading) return;
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/e/${slug}/photos/${photoId}/like`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { liked: boolean; count: number };
        setLiked(data.liked);
        setCount(data.count);
      } else {
        setLiked(prevLiked);
        setCount(prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoading}
      aria-label={liked ? t.photo.unlike : t.photo.like}
      aria-pressed={liked}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        liked
          ? "border-brand/30 bg-brand/15 text-brand"
          : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
      )}
    >
      <Heart className={cn("h-[18px] w-[18px] transition", liked && "fill-brand animate-pop")} />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
