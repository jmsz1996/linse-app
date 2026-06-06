"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Pencil, Play, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagDot } from "@/components/guest/tag-dot";
import { useT } from "@/components/guest/locale-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TagItem {
  id: string;
  label: string;
  color: string | null;
}

export interface MyPhotoItem {
  id: string;
  isVideo: boolean;
  tags: TagItem[];
}

const tileBase =
  "relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-soft";

export function MyPhotosGrid({
  slug,
  initialPhotos,
  eventTags,
}: {
  slug: string;
  initialPhotos: MyPhotoItem[];
  eventTags: TagItem[];
}) {
  const t = useT();
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<MyPhotoItem | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const canTag = eventTags.length > 0;
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

  async function deleteSelected() {
    if (selected.size === 0 || busy) return;
    if (!window.confirm(t.me.deleteConfirm(selected.size))) return;
    setBusy(true);
    for (const id of [...selected]) {
      try {
        const res = await fetch(`/api/e/${slug}/photos/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          // 404 = already gone; treat as deleted either way.
          setPhotos((prev) => prev.filter((p) => p.id !== id));
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      } catch {
        // network error — leave it selected so the user can retry
      }
    }
    setBusy(false);
    setSelectMode(false);
  }

  function openTagEditor(photo: MyPhotoItem) {
    setEditing(photo);
    setPendingTagIds(photo.tags.map((tg) => tg.id));
  }

  function togglePendingTag(id: string) {
    setPendingTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function saveTags() {
    if (!editing || savingTags) return;
    setSavingTags(true);
    try {
      const res = await fetch(`/api/e/${slug}/photos/${editing.id}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: pendingTagIds }),
      });
      if (res.ok) {
        const data = (await res.json()) as { tags: TagItem[] };
        setPhotos((prev) =>
          prev.map((p) => (p.id === editing.id ? { ...p, tags: data.tags } : p))
        );
        setEditing(null);
      }
    } catch {
      // keep the dialog open on failure
    }
    setSavingTags(false);
  }

  function media(photo: MyPhotoItem) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/e/${slug}/photos/${photo.id}/thumb`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {photo.isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur-sm">
              <Play className="h-4 w-4 translate-x-[1px] fill-white" />
            </span>
          </span>
        )}
        {photo.tags.length > 0 && (
          <div className="pointer-events-none absolute bottom-2 left-2 flex gap-1">
            {photo.tags.slice(0, 3).map((tag) => (
              <TagDot key={tag.id} color={tag.color} className="ring-1 ring-white/50" />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg">{t.me.myPhotos}</h2>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {selectMode ? <X className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
            {selectMode ? t.feed.cancel : t.feed.select}
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
          {t.me.myPhotosEmpty}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t.me.selectToManage}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {photos.map((photo) => {
              const isSel = selected.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={cn(
                    tileBase,
                    selectMode && isSel && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  )}
                >
                  {media(photo)}

                  {selectMode ? (
                    <button
                      type="button"
                      onClick={() => toggle(photo.id)}
                      aria-pressed={isSel}
                      className="absolute inset-0"
                    >
                      <span
                        className={cn(
                          "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                          isSel
                            ? "border-foreground bg-foreground text-background"
                            : "border-white/70 bg-black/25 text-transparent"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/e/${slug}/p/${photo.id}`}
                        className="absolute inset-0"
                        aria-label="Open"
                      />
                      {canTag && (
                        <button
                          type="button"
                          onClick={() => openTagEditor(photo)}
                          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
                          aria-label={t.me.editTags}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-sm items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {allSelected ? t.feed.clear : t.feed.selectAll}
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0 || busy}
              className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-soft transition active:scale-95 disabled:opacity-40"
            >
              <Trash2 className="h-[18px] w-[18px]" />
              {t.me.deleteSelected}
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.me.editTags}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {eventTags.map((tag) => {
              const on = pendingTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => togglePendingTag(tag.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    on
                      ? "bg-foreground text-background"
                      : "border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  <TagDot color={tag.color} className={on ? "ring-1 ring-background/40" : ""} />
                  {tag.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveTags}
            disabled={savingTags}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-semibold text-background shadow-soft transition active:scale-[0.99] disabled:opacity-50"
          >
            {savingTags ? t.me.saving : t.me.saveTags}
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
