"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CopyCheck, ImagePlus, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagDot } from "@/components/guest/tag-dot";
import { useT } from "@/components/guest/locale-provider";

interface Tag {
  id: string;
  label: string;
  color: string | null;
}

interface UploadFormProps {
  slug: string;
  tags: Tag[];
  allowVideos: boolean;
}

interface FileEntry {
  file: File;
  preview: string;
  isVideo: boolean;
  status: "pending" | "uploading" | "done" | "duplicate" | "error";
  error?: string;
}

export function UploadForm({ slug, tags, allowVideos }: UploadFormProps) {
  const router = useRouter();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const entries: FileEntry[] = picked.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...entries]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleUpload() {
    if (!files.length) return;
    setIsUploading(true);
    setUploadCount(0);

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f)));

      const form = new FormData();
      form.append("file", files[i].file);
      selectedTagIds.forEach((id) => form.append("tagIds", id));

      try {
        const res = await fetch(`/api/e/${slug}/photos`, { method: "POST", body: form });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          const error =
            res.status === 507 ? t.upload.quotaReached : data.error ?? t.errors.generic;
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: "error", error } : f))
          );
        } else {
          const data = (await res.json().catch(() => ({}))) as { duplicate?: boolean };
          const status = data.duplicate ? "duplicate" : "done";
          setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status } : f)));
          setUploadCount((c) => c + 1);
        }
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "error", error: t.errors.network } : f))
        );
      }
    }

    setIsUploading(false);
    const anyError = files.some((f) => f.status === "error");
    if (!anyError) router.push(`/e/${slug}/feed`);
  }

  const hasFiles = files.length > 0;
  const allDone = hasFiles && files.every((f) => f.status === "done" || f.status === "duplicate");

  return (
    <div className="space-y-7">
      <input
        ref={inputRef}
        type="file"
        accept={allowVideos ? "image/*,video/mp4,video/webm,video/quicktime" : "image/*"}
        multiple
        className="sr-only"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center transition-colors hover:border-brand/50 hover:bg-card"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground transition-colors group-hover:bg-brand/15 group-hover:text-brand">
          <ImagePlus className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <span className="space-y-1">
          <span className="block text-[15px] font-semibold">{hasFiles ? t.upload.addMorePhotos : t.upload.addPhotos}</span>
          <span className="block text-xs text-muted-foreground">{allowVideos ? t.upload.pickHintVideo : t.upload.pickHint}</span>
        </span>
      </button>

      {hasFiles && (
        <div className="grid grid-cols-3 gap-2.5">
          {files.map((entry, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-soft">
              {entry.isVideo ? (
                <video
                  src={entry.preview}
                  muted
                  playsInline
                  preload="metadata"
                  className={cn(
                    "h-full w-full object-cover transition-opacity",
                    (entry.status === "uploading" || entry.status === "done" || entry.status === "duplicate") && "opacity-55"
                  )}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={entry.preview}
                  alt=""
                  className={cn(
                    "h-full w-full object-cover transition-opacity",
                    (entry.status === "uploading" || entry.status === "done" || entry.status === "duplicate") && "opacity-55"
                  )}
                />
              )}
              {entry.isVideo && entry.status === "pending" && (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white" />
                </span>
              )}
              {entry.status === "pending" && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white backdrop-blur-sm transition hover:bg-black/75"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {entry.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {entry.status === "done" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-soft">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </div>
              )}
              {entry.status === "duplicate" && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/80 text-background shadow-soft backdrop-blur-sm">
                      <CopyCheck className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-foreground/75 px-1.5 py-1">
                    <span className="block truncate text-center text-[11px] font-medium text-background">
                      {t.upload.duplicate}
                    </span>
                  </div>
                </>
              )}
              {entry.status === "error" && (
                <div className="absolute inset-x-0 bottom-0 bg-destructive/85 px-1.5 py-1">
                  <span className="block truncate text-[11px] font-medium text-destructive-foreground">
                    {entry.error}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-sm font-medium">{t.upload.tagThese}</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
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
        </div>
      )}

      {hasFiles && !allDone && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-semibold text-background shadow-soft transition active:scale-[0.99] disabled:opacity-50"
        >
          {isUploading
            ? t.upload.uploadingProgress(uploadCount + 1, files.length)
            : t.upload.uploadN(files.length)}
        </button>
      )}

      {files.some((f) => f.status === "error") && (
        <button
          type="button"
          onClick={() => router.push(`/e/${slug}/feed`)}
          className="flex w-full items-center justify-center rounded-2xl border border-border bg-card py-3.5 text-[15px] font-semibold transition hover:bg-accent active:scale-[0.99]"
        >
          {t.upload.goToFeed}
        </button>
      )}
    </div>
  );
}
