"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/guest/locale-provider";

interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: string;
  guest: { displayName: string };
}

interface CommentSectionProps {
  photoId: string;
  slug: string;
  initialComments: CommentWithAuthor[];
}

export function CommentSection({ photoId, slug, initialComments }: CommentSectionProps) {
  const t = useT();
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/e/${slug}/stream`);
    es.addEventListener("new_comment", (e) => {
      const data = JSON.parse(e.data) as {
        photoId: string;
        commentId: string;
        authorName: string;
        body: string;
      };
      if (data.photoId !== photoId) return;
      setComments((prev) => {
        if (prev.some((c) => c.id === data.commentId)) return prev;
        return [
          ...prev,
          {
            id: data.commentId,
            body: data.body,
            createdAt: new Date().toISOString(),
            guest: { displayName: data.authorName },
          },
        ];
      });
    });
    return () => es.close();
  }, [slug, photoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/e/${slug}/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to post comment");
        return;
      }
      const data = (await res.json()) as { comment: CommentWithAuthor };
      setComments((prev) => {
        if (prev.some((c) => c.id === data.comment.id)) return prev;
        return [...prev, data.comment];
      });
      setBody("");
    } catch {
      setError(t.errors.network);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="max-h-52 space-y-2.5 overflow-y-auto pr-1 scrollbar-none">
        {comments.length === 0 && (
          <p className="py-3 text-center text-sm text-white/35">{t.photo.noComments}</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-sm leading-snug">
            <span className="font-semibold text-white">{c.guest.displayName}</span>{" "}
            <span className="text-white/65">{c.body}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.photo.addComment}
          maxLength={500}
          className="h-11 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-white/[0.09]"
        />
        <button
          type="submit"
          disabled={isSubmitting || !body.trim()}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition active:scale-95 disabled:opacity-40"
        >
          {t.photo.post}
        </button>
      </form>
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
