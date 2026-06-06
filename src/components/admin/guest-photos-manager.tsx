"use client";

import { useState } from "react";
import { Check, Download, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ManagedPhoto {
  id: string;
  isVideo: boolean;
  hidden: boolean;
}

interface GuestPhotosManagerProps {
  eventId: string;
  initialPhotos: ManagedPhoto[];
}

export function GuestPhotosManager({ eventId, initialPhotos }: GuestPhotosManagerProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = photos.length > 0 && selected.size === photos.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));
  }

  // Native download: navigate a hidden anchor to the GET endpoint so the browser
  // streams the archive straight to disk (Content-Disposition: attachment).
  function download() {
    if (selected.size === 0) return;
    const ids = encodeURIComponent([...selected].join(","));
    const a = document.createElement("a");
    a.href = `/api/admin/events/${eventId}/photos/download-zip?ids=${ids}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function deleteSelected() {
    if (selected.size === 0 || busy) return;
    const ids = [...selected];
    if (
      !window.confirm(
        `Permanently delete ${ids.length} item${ids.length !== 1 ? "s" : ""}? This removes them from the server and can't be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Delete failed");
      } else {
        const deletedSet = new Set(ids);
        setPhotos((prev) => prev.filter((p) => !deletedSet.has(p.id)));
        setSelected(new Set());
      }
    } catch {
      setError("Network error — please try again");
    }
    setBusy(false);
  }

  if (photos.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <p className="text-sm text-muted-foreground">This guest hasn&apos;t uploaded anything.</p>
      </section>
    );
  }

  return (
    <section className="pb-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Photos
          <span className="ml-2 text-sm font-normal text-muted-foreground">{photos.length}</span>
        </h2>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {allSelected ? "Clear" : "Select all"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <p className="text-xs text-muted-foreground mb-3">
        Tap a photo to select, then download or delete the selection.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo) => {
          const isSel = selected.has(photo.id);
          return (
            <button
              type="button"
              key={photo.id}
              onClick={() => toggle(photo.id)}
              aria-pressed={isSel}
              className={[
                "relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800",
                isSel ? "ring-2 ring-offset-2 ring-foreground ring-offset-background" : "",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/events/${eventId}/photos/${photo.id}`}
                alt=""
                loading="lazy"
                className={["h-full w-full object-cover", photo.hidden ? "opacity-40" : ""].join(" ")}
              />

              {photo.isVideo && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur-sm">
                    <Play className="h-4 w-4 translate-x-[1px] fill-white" />
                  </span>
                </span>
              )}

              {photo.hidden && (
                <div className="absolute left-1.5 top-1.5">
                  <Badge variant="secondary" className="text-xs">Hidden</Badge>
                </div>
              )}

              <span
                className={[
                  "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                  isSel
                    ? "border-foreground bg-foreground text-background"
                    : "border-white/70 bg-black/25 text-transparent",
                ].join(" ")}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
            <span className="text-sm font-medium text-muted-foreground">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={download} disabled={busy}>
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={busy}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
