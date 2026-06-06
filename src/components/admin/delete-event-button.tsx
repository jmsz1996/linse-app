"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DeleteEventButtonProps {
  eventId: string;
  eventName: string;
}

export function DeleteEventButton({ eventId, eventName }: DeleteEventButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${eventName}" and all its photos, guests, and comments? This cannot be undone.`)) return;

    setIsDeleting(true);
    setError(null);

    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Delete failed");
      setIsDeleting(false);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
        {isDeleting ? "Deleting…" : "Delete event"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
