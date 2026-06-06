"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EventFormProps {
  initialValues?: {
    id: string;
    name: string;
    slug: string;
    startsAt: string | null;
    endsAt: string | null;
    storageLimitMb?: number;
    allowVideos?: boolean;
    commentLimitPerHour?: number;
    description?: string | null;
    footer?: string | null;
    accessPassword?: string | null;
  };
  onSuccess?: (event: { id: string }) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function EventForm({ initialValues, onSuccess }: EventFormProps) {
  const uid = useId();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!initialValues);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initialValues?.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initialValues?.endsAt));
  const [storageLimitMb, setStorageLimitMb] = useState(initialValues?.storageLimitMb ?? 1024);
  const [allowVideos, setAllowVideos] = useState(initialValues?.allowVideos ?? false);
  const [commentLimit, setCommentLimit] = useState(initialValues?.commentLimitPerHour ?? 30);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [footer, setFooter] = useState(initialValues?.footer ?? "");
  const [accessPassword, setAccessPassword] = useState(initialValues?.accessPassword ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const url = initialValues
      ? `/api/admin/events/${initialValues.id}`
      : "/api/admin/events";
    const method = initialValues ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        storageLimitMb,
        allowVideos,
        commentLimitPerHour: commentLimit,
        description: description || null,
        footer: footer || null,
        accessPassword: accessPassword.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as {
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };
      if (data.details?.fieldErrors) setFieldErrors(data.details.fieldErrors);
      setError(data.error ?? "Something went wrong");
      setIsSubmitting(false);
      return;
    }

    const data = (await res.json()) as { event: { id: string } };
    onSuccess?.(data.event);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-name`}>Event name</Label>
        <Input
          id={`${uid}-name`}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Summer Party 2025"
          required
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-slug`}>
          Guest page URL
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
            auto-filled from name
          </span>
        </Label>
        <div className="flex items-center rounded-md border border-input bg-transparent text-sm shadow-xs has-focus-visible:ring-1 has-focus-visible:ring-ring overflow-hidden">
          <span className="px-3 py-2 text-muted-foreground border-r border-input bg-muted/40 shrink-0 select-none">
            /e/
          </span>
          <input
            id={`${uid}-slug`}
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="summer-party-2025"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
            required
            className="flex-1 px-3 py-2 bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
          />
        </div>
        {fieldErrors.slug && (
          <p className="text-sm text-destructive">{fieldErrors.slug[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-starts`}>Starts</Label>
          <Input
            id={`${uid}-starts`}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={cn(startsAt && "text-foreground")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-ends`}>Ends</Label>
          <Input
            id={`${uid}-ends`}
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            min={startsAt || undefined}
            className={cn(endsAt && "text-foreground")}
          />
          {fieldErrors.endsAt && (
            <p className="text-sm text-destructive">{fieldErrors.endsAt[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-storage-limit`}>
            Storage cap
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">MB per guest · 0 = unlimited</span>
          </Label>
          <Input
            id={`${uid}-storage-limit`}
            type="number"
            min={0}
            max={102400}
            value={storageLimitMb}
            onChange={(e) => setStorageLimitMb(Number(e.target.value))}
          />
          {fieldErrors.storageLimitMb && (
            <p className="text-sm text-destructive">{fieldErrors.storageLimitMb[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-comment-limit`}>
            Comments / hour
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">per guest</span>
          </Label>
          <Input
            id={`${uid}-comment-limit`}
            type="number"
            min={1}
            max={1000}
            value={commentLimit}
            onChange={(e) => setCommentLimit(Number(e.target.value))}
          />
          {fieldErrors.commentLimitPerHour && (
            <p className="text-sm text-destructive">{fieldErrors.commentLimitPerHour[0]}</p>
          )}
        </div>
      </div>

      <label
        htmlFor={`${uid}-allow-videos`}
        className="flex items-center justify-between gap-4 rounded-md border border-input px-3.5 py-3 cursor-pointer"
      >
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Allow video uploads</span>
          <span className="block text-xs text-muted-foreground">
            Guests can upload short videos (mp4, webm, mov) in addition to photos.
          </span>
        </span>
        <input
          id={`${uid}-allow-videos`}
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-foreground"
          checked={allowVideos}
          onChange={(e) => setAllowVideos(e.target.checked)}
        />
      </label>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-description`}>
          Description
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">optional</span>
        </Label>
        <Textarea
          id={`${uid}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description for your guests…"
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-footer`}>
          Footer text
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">optional</span>
        </Label>
        <Input
          id={`${uid}-footer`}
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Thanks for coming! 🎉"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-password`}>
          Access password
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">optional</span>
        </Label>
        <Input
          id={`${uid}-password`}
          type="text"
          value={accessPassword}
          onChange={(e) => setAccessPassword(e.target.value)}
          placeholder="Leave blank for a public event"
          maxLength={128}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Guests must enter this to see, upload, or download photos. The QR code includes it, so
          scanning unlocks automatically. Blank = anyone with the link can join.
        </p>
        {fieldErrors.accessPassword && (
          <p className="text-sm text-destructive">{fieldErrors.accessPassword[0]}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : initialValues ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
