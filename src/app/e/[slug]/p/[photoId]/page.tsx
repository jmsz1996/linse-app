import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuest } from "@/lib/page-guards";
import { LikeButton } from "@/components/guest/like-button";
import { TagDot } from "@/components/guest/tag-dot";
import { CommentSection } from "@/components/guest/comment-section";
import { PhotoNav } from "@/components/guest/photo-nav";
import { LanguageSwitcher } from "@/components/guest/language-switcher";
import { getLocale, dateLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function photoUrl(slug: string, id: string, tagId?: string) {
  return `/e/${slug}/p/${id}${tagId ? `?tagId=${tagId}` : ""}`;
}

export default async function PhotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; photoId: string }>;
  searchParams: Promise<{ tagId?: string }>;
}) {
  const { slug, photoId } = await params;
  const { tagId } = await searchParams;

  const guest = await requireGuest(slug);

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true, name: true } });
  if (!event) redirect(`/e/${slug}`);

  const tagFilter = tagId ? { photoTags: { some: { tagId } } } : {};
  const baseWhere = { eventId: event.id, hiddenAt: null, ...tagFilter };

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, ...baseWhere },
    select: {
      id: true,
      mimeType: true,
      uploadedAt: true,
      guest: { select: { displayName: true } },
      photoTags: { select: { tag: { select: { id: true, label: true, color: true } } } },
      _count: { select: { likes: true } },
      likes: { where: { guestId: guest.id } },
    },
  });
  if (!photo) notFound();

  const [prevPhoto, nextPhoto] = await Promise.all([
    prisma.photo.findFirst({
      where: { ...baseWhere, uploadedAt: { gt: photo.uploadedAt } },
      orderBy: { uploadedAt: "asc" },
      select: { id: true },
    }),
    prisma.photo.findFirst({
      where: { ...baseWhere, uploadedAt: { lt: photo.uploadedAt } },
      orderBy: { uploadedAt: "desc" },
      select: { id: true },
    }),
  ]);

  const initialComments = await prisma.comment.findMany({
    where: { photoId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      guest: { select: { displayName: true } },
    },
  });

  const locale = await getLocale();
  const t = dictionaries[locale];
  const uploadedAt = new Date(photo.uploadedAt).toLocaleString(dateLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const feedUrl = tagId ? `/e/${slug}/feed?tagId=${tagId}` : `/e/${slug}/feed`;
  const prevUrl = prevPhoto ? photoUrl(slug, prevPhoto.id, tagId) : null;
  const nextUrl = nextPhoto ? photoUrl(slug, nextPhoto.id, tagId) : null;
  const initial = photo.guest.displayName.trim().charAt(0).toUpperCase() || "?";
  const isVideo = photo.mimeType.startsWith("video/");

  return (
    <PhotoNav prevUrl={prevUrl} nextUrl={nextUrl}>
      <main className="flex min-h-dvh flex-col bg-[#14110d] text-white">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link
            href={feedUrl}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate font-display text-[15px]">{event.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <a
              href={`/api/e/${slug}/photos/${photoId}/download`}
              download
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={t.photo.downloadAria}
            >
              <Download className="h-[18px] w-[18px]" />
            </a>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-3 py-2 sm:px-8">
          {isVideo ? (
            <video
              src={`/api/e/${slug}/photos/${photoId}/original`}
              controls
              playsInline
              preload="metadata"
              className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/e/${slug}/photos/${photoId}/original`}
              alt=""
              className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-xl space-y-5 px-5 pb-12 pt-7 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[17px] leading-tight">{photo.guest.displayName}</p>
                <p className="text-xs text-white/45">{uploadedAt}</p>
              </div>
            </div>
            <LikeButton
              photoId={photo.id}
              slug={slug}
              initialCount={photo._count.likes}
              initialLiked={photo.likes.length > 0}
            />
          </div>

          {photo.photoTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photo.photoTags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75"
                >
                  <TagDot color={tag.color} />
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          <div className="h-px bg-white/10" />

          <CommentSection
            photoId={photo.id}
            slug={slug}
            initialComments={initialComments.map((c) => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
            }))}
          />
        </div>
      </main>
    </PhotoNav>
  );
}
