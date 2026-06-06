"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TagDot } from "@/components/guest/tag-dot";
import { useT } from "@/components/guest/locale-provider";

interface Tag {
  id: string;
  label: string;
  color: string | null;
}

interface TagFilterProps {
  slug: string;
  tags: Tag[];
  activeTagId: string | null;
}

const base =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors";
const inactive =
  "border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground";
const active = "bg-foreground text-background";

export function TagFilter({ slug, tags, activeTagId }: TagFilterProps) {
  const router = useRouter();
  const t = useT();

  function select(tagId: string | null) {
    router.push(tagId ? `/e/${slug}/feed?tagId=${tagId}` : `/e/${slug}/feed`);
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <button
        type="button"
        onClick={() => select(null)}
        className={cn(base, !activeTagId ? active : inactive)}
      >
        {t.feed.allTag}
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => select(tag.id)}
          className={cn(base, activeTagId === tag.id ? active : inactive)}
        >
          <TagDot color={tag.color} className={activeTagId === tag.id ? "ring-1 ring-background/40" : ""} />
          {tag.label}
        </button>
      ))}
    </div>
  );
}
