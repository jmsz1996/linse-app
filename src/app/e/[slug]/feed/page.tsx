import Link from "next/link";
import { redirect } from "next/navigation";
import { Aperture, Camera } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuest } from "@/lib/page-guards";
import { TagFilter } from "@/components/guest/tag-filter";
import { FeedGrid } from "@/components/guest/feed-grid";
import { RecoveryStasher } from "@/components/guest/recovery-stasher";
import { FeedUpdater } from "@/components/guest/feed-updater";
import { LanguageSwitcher } from "@/components/guest/language-switcher";
import { getDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tagId?: string }>;
}) {
  const { slug } = await params;
  const { tagId } = await searchParams;

  const guest = await requireGuest(slug);

  const event = await prisma.event.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      tags: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!event) redirect(`/e/${slug}`);

  const photos = await prisma.photo.findMany({
    where: {
      eventId: event.id,
      hiddenAt: null,
      ...(tagId ? { photoTags: { some: { tagId } } } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    take: 60,
    select: {
      id: true,
      mimeType: true,
      guest: { select: { displayName: true } },
      photoTags: {
        select: { tag: { select: { id: true, label: true, color: true } } },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const t = await getDict();
  const initial = guest.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="flex flex-1 flex-col">
      <RecoveryStasher slug={slug} />
      <FeedUpdater slug={slug} />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl leading-tight sm:text-2xl">{event.name}</h1>
              {event.description && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <Link
                href={`/e/${slug}/me`}
                className="group flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-1 transition-colors hover:border-foreground/20 sm:pr-3.5"
                aria-label={t.feed.profileAria}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {initial}
                </span>
                <span className="hidden max-w-[9rem] truncate text-sm text-muted-foreground group-hover:text-foreground sm:block">
                  {guest.displayName}
                </span>
              </Link>
            </div>
          </div>
          {event.tags.length > 0 && (
            <div className="pb-3">
              <TagFilter
                slug={slug}
                tags={event.tags.map((tag) => ({ id: tag.id, label: tag.label, color: tag.color }))}
                activeTagId={tagId ?? null}
              />
            </div>
          )}
        </div>
      </header>

      {photos.length === 0 ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center animate-fade">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card shadow-soft">
              <Aperture className="h-7 w-7 text-muted-foreground" strokeWidth={1.4} />
            </div>
            <h2 className="mt-5 font-display text-2xl">
              {tagId ? t.feed.emptyTitleFiltered : t.feed.emptyTitle}
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              {tagId ? t.feed.emptyBodyFiltered : t.feed.emptyBody}
            </p>
            <Link
              href={`/e/${slug}/upload`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-soft transition active:scale-95"
            >
              <Camera className="h-[18px] w-[18px]" />
              {t.feed.shareCta}
            </Link>
          </div>
          <Link
            href={`/e/${slug}/upload`}
            className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-lift transition active:scale-95 sm:right-7"
            aria-label={t.feed.shareFab}
          >
            <Camera className="h-[18px] w-[18px]" />
            {t.feed.shareFab}
          </Link>
        </>
      ) : (
        <FeedGrid
          slug={slug}
          tagId={tagId}
          photos={photos.map((photo) => ({
            id: photo.id,
            displayName: photo.guest.displayName,
            isVideo: photo.mimeType.startsWith("video/"),
            tags: photo.photoTags.map(({ tag }) => ({ id: tag.id, color: tag.color })),
            likes: photo._count.likes,
            comments: photo._count.comments,
          }))}
        />
      )}

      <div className="h-24 shrink-0" />
    </main>
  );
}
