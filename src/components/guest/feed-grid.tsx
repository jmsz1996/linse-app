"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Check, CheckCheck, Download, Heart, MessageCircle, Play, X } from "lucide-react";
import { TagDot } from "@/components/guest/tag-dot";
import { useT } from "@/components/guest/locale-provider";

interface PhotoItem {
  id: string;
  displayName: string;
  isVideo: boolean;
  tags: { id: string; color: string | null }[];
  likes: number;
  comments: number;
}

const tileBase =
  "group relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-soft transition-shadow duration-300 animate-rise";

export function FeedGrid({
  slug,
  tagId,
  photos,
}: {
  slug: string;
  tagId?: string;
  photos: PhotoItem[];
}) {
  const t = useT();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = photos.length > 0 && selected.size === photos.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  // Native download: navigate a hidden anchor to the GET endpoint so the browser
  // streams the archive straight to disk (Content-Disposition: attachment). No
  // in-memory blob and no URL-revoke timing — which is what left a stuck
  // `.crdownload` before.
  function download() {
    if (selected.size === 0) return;
    const ids = encodeURIComponent([...selected].join(","));
    const a = document.createElement("a");
    a.href = `/api/e/${slug}/photos/download-zip?ids=${ids}`;
    a.download = `${slug}-photos.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    exitSelect();
  }

  // Tile contents (thumbnail + name/likes/comments overlay + tag dots), shared
  // between the navigating <Link> (normal) and the selectable <button> (select).
  function tileInner(photo: PhotoItem) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/e/${slug}/photos/${photo.id}/thumb`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        {photo.isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur-sm">
              <Play className="h-5 w-5 translate-x-[1px] fill-white" />
            </span>
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 via-black/10 to-transparent px-3 pb-2.5 pt-10">
          <span className="truncate text-[13px] font-medium text-white/95 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)]">
            {photo.displayName}
          </span>
          {(photo.likes > 0 || photo.comments > 0) && (
            <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
              {photo.likes > 0 && (
                <span className="flex items-center gap-0.5">
                  <Heart className="h-3 w-3 fill-white/90" />
                  {photo.likes}
                </span>
              )}
              {photo.comments > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="h-3 w-3" />
                  {photo.comments}
                </span>
              )}
            </span>
          )}
        </div>
        {photo.tags.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex gap-1">
            {photo.tags.slice(0, 3).map((tag) => (
              <TagDot key={tag.id} color={tag.color} className="ring-1 ring-white/50" />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {selectMode ? <X className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
            {selectMode ? t.feed.cancel : t.feed.select}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {photos.map((photo, i) => {
            const style = { animationDelay: `${Math.min(i, 11) * 45}ms` };
            if (selectMode) {
              const isSel = selected.has(photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => toggle(photo.id)}
                  aria-pressed={isSel}
                  className={`${tileBase} text-left ${isSel ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                  style={style}
                >
                  {tileInner(photo)}
                  <span
                    className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      isSel
                        ? "border-foreground bg-foreground text-background"
                        : "border-white/70 bg-black/25 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={photo.id}
                href={`/e/${slug}/p/${photo.id}${tagId ? `?tagId=${tagId}` : ""}`}
                className={`${tileBase} hover:shadow-lift`}
                style={style}
              >
                {tileInner(photo)}
              </Link>
            );
          })}
        </div>
      </div>

      {!selectMode && (
        <Link
          href={`/e/${slug}/upload`}
          className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-lift transition active:scale-95 sm:right-7"
          aria-label={t.feed.shareFab}
        >
          <Camera className="h-[18px] w-[18px]" />
          {t.feed.shareFab}
        </Link>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {t.feed.selectedN(selected.size)}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))
                }
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {allSelected ? t.feed.clear : t.feed.selectAll}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-soft transition active:scale-95 disabled:opacity-40"
              >
                <Download className="h-[18px] w-[18px]" />
                {t.feed.download}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
