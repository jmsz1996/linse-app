"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Photo {
  id: string;
  uploadedAt: string;
  guestId: string;
  guest: { displayName: string };
  hiddenAt: string | null;
  _count: { likes: number; comments: number };
}

interface PhotoModerationGridProps {
  eventId: string;
  initialPhotos: Photo[];
}

export function PhotoModerationGrid({ eventId, initialPhotos }: PhotoModerationGridProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleAction(photoId: string, action: "hide" | "unhide" | "delete") {
    if (action === "delete" && !window.confirm("Delete this photo permanently? This removes it from the server and can't be undone.")) {
      return;
    }

    setPendingIds((prev) => new Set(prev).add(photoId));
    const snapshot = photos;

    setPhotos((prev) =>
      action === "delete"
        ? prev.filter((p) => p.id !== photoId)
        : prev.map((p) =>
            p.id === photoId
              ? { ...p, hiddenAt: action === "hide" ? new Date().toISOString() : null }
              : p
          )
    );

    const res = await fetch(`/api/admin/events/${eventId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      setPhotos(snapshot);
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Action failed");
    } else {
      setError(null);
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  }

  if (photos.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">
        Photos
        <span className="ml-2 text-sm font-normal text-muted-foreground">{photos.length}</span>
      </h2>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo) => {
          const isHidden = photo.hiddenAt !== null;
          const isPending = pendingIds.has(photo.id);

          return (
            <div
              key={photo.id}
              className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800"
            >
              <div className={["aspect-square relative", isHidden ? "opacity-40" : ""].join(" ")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/events/${eventId}/photos/${photo.id}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {isHidden && (
                <div className="absolute top-1.5 left-1.5">
                  <Badge variant="secondary" className="text-xs">Hidden</Badge>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleAction(photo.id, isHidden ? "unhide" : "hide")}
                  className="w-20 text-xs"
                >
                  {isHidden ? "Unhide" : "Hide"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleAction(photo.id, "delete")}
                  className="w-20 text-xs"
                >
                  Delete
                </Button>
              </div>

              <div className="px-1.5 py-1 text-xs text-muted-foreground truncate">
                {photo.guest.displayName} · ♥ {photo._count.likes} · 💬 {photo._count.comments}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
