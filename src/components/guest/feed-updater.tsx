"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/guest/locale-provider";

export function FeedUpdater({ slug }: { slug: string }) {
  const [hasNew, setHasNew] = useState(false);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    const es = new EventSource(`/api/e/${slug}/stream`);
    es.addEventListener("new_photo", () => setHasNew(true));
    return () => es.close();
  }, [slug]);

  if (!hasNew) return null;

  return (
    <div className="fixed left-1/2 top-[4.75rem] z-40 -translate-x-1/2 animate-rise">
      <button
        type="button"
        onClick={() => {
          setHasNew(false);
          router.refresh();
        }}
        className="flex items-center gap-2.5 rounded-full bg-foreground py-2 pl-3 pr-4 text-sm font-medium text-background shadow-lift transition active:scale-95"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        {t.feed.newPhotos}
      </button>
    </div>
  );
}
