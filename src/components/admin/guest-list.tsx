"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Guest {
  id: string;
  displayName: string;
  createdAt: string;
  blockedAt: string | null;
  _count: { photos: number; comments: number };
}

interface GuestListProps {
  eventId: string;
  initialGuests: Guest[];
}

export function GuestList({ eventId, initialGuests }: GuestListProps) {
  const [guests, setGuests] = useState(initialGuests);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleAction(guestId: string, action: "block" | "unblock") {
    setPendingIds((prev) => new Set(prev).add(guestId));
    const snapshot = guests;

    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== guestId) return g;
        return { ...g, blockedAt: action === "block" ? new Date().toISOString() : null };
      })
    );

    const res = await fetch(`/api/admin/events/${eventId}/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      setGuests(snapshot);
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Action failed");
    } else {
      setError(null);
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(guestId);
      return next;
    });
  }

  async function handleDelete(guestId: string, displayName: string) {
    if (!window.confirm(`Delete ${displayName} and all their photos, likes, and comments? This cannot be undone.`)) return;

    setPendingIds((prev) => new Set(prev).add(guestId));

    const res = await fetch(`/api/admin/events/${eventId}/guests/${guestId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Delete failed");
    } else {
      setError(null);
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(guestId);
      return next;
    });
  }

  if (guests.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-4">Guests</h2>
        <p className="text-sm text-muted-foreground">No guests have joined yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">
        Guests
        <span className="ml-2 text-sm font-normal text-muted-foreground">{guests.length}</span>
      </h2>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Photos</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Comments</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {guests.map((guest) => {
              const isBlocked = guest.blockedAt !== null;
              const isPending = pendingIds.has(guest.id);
              return (
                <tr key={guest.id} className={isBlocked ? "opacity-60" : ""}>
                  <td className="px-4 py-2 font-medium">{guest.displayName}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{guest._count.photos}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{guest._count.comments}</td>
                  <td className="px-4 py-2 text-center">
                    {isBlocked ? (
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {guest._count.photos > 0 && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/events/${eventId}/guests/${guest.id}`}>
                            View photos
                          </Link>
                        </Button>
                      )}
                      {isBlocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleAction(guest.id, "unblock")}
                        >
                          Unblock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleAction(guest.id, "block")}
                        >
                          Block
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(guest.id, guest.displayName)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
