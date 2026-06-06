"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TAG_COLORS } from "@/lib/schemas/tag";

interface Tag {
  id: string;
  label: string;
  color: string | null;
  sortOrder: number;
}

interface TagManagerProps {
  eventId: string;
  initialTags: Tag[];
}

export function TagManager({ eventId, initialTags }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLORS[0].value);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setIsAdding(true);
    setError(null);

    const res = await fetch(`/api/admin/events/${eventId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
    });

    if (res.ok) {
      const data = (await res.json()) as { tag: Tag };
      setTags((prev) => [...prev, data.tag]);
      setNewLabel("");
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to add tag");
    }
    setIsAdding(false);
  }

  async function handleDelete(tagId: string) {
    setDeletingIds((prev) => new Set(prev).add(tagId));
    const snapshot = tags;
    setTags((prev) => prev.filter((t) => t.id !== tagId));

    const res = await fetch(`/api/admin/events/${eventId}/tags/${tagId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setTags(snapshot);
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Failed to delete tag");
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(tagId);
      return next;
    });
  }

  return (
    <section>
      <h2 className="text-base font-semibold mb-4">Tags</h2>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 pr-1"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color ?? "#71717a" }}
                />
                {tag.label}
                <button
                  type="button"
                  onClick={() => handleDelete(tag.id)}
                  disabled={deletingIds.has(tag.id)}
                  className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 disabled:opacity-30 transition-opacity"
                  aria-label={`Remove ${tag.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          No tags yet. Add the first one below.
        </p>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <label className="text-sm font-medium text-foreground">New tag</label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Ceremony"
            maxLength={50}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">Color</span>
          <div className="flex gap-1.5 pt-0.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setNewColor(c.value)}
                className={cn(
                  "w-6 h-6 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  newColor === c.value && "ring-2 ring-offset-2 ring-zinc-500"
                )}
                style={{ backgroundColor: c.value }}
                aria-label={c.label}
                aria-pressed={newColor === c.value}
              />
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isAdding || !newLabel.trim()}>
          {isAdding ? "Adding…" : "Add tag"}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
