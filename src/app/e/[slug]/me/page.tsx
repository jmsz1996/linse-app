import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireGuest } from "@/lib/page-guards";
import { GuestPageHeader } from "@/components/guest/guest-page-header";
import { RecoverySection } from "@/components/guest/recovery-section";
import { MyPhotosGrid } from "@/components/guest/my-photos-grid";
import { getDict } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guest = await requireGuest(slug);

  const [event, myPhotos, h, t] = await Promise.all([
    prisma.event.findFirst({
      where: { slug },
      select: {
        name: true,
        storageLimitMb: true,
        tags: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, color: true },
        },
      },
    }),
    prisma.photo.findMany({
      where: { guestId: guest.id, eventId: guest.eventId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        mimeType: true,
        fileSize: true,
        photoTags: { select: { tag: { select: { id: true, label: true, color: true } } } },
      },
    }),
    headers(),
    getDict(),
  ]);

  const myPhotoItems = myPhotos.map((p) => ({
    id: p.id,
    isVideo: p.mimeType.startsWith("video/"),
    tags: p.photoTags.map(({ tag }) => ({ id: tag.id, label: tag.label, color: tag.color })),
  }));

  const usedBytes = myPhotos.reduce((sum, p) => sum + p.fileSize, 0);
  const storageLimitMb = event?.storageLimitMb ?? 0;

  function fmtMb(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) return "< 0.1 MB";
    if (mb < 10) return `${mb.toFixed(1)} MB`;
    return `${Math.round(mb)} MB`;
  }

  const storageLabel =
    storageLimitMb > 0
      ? t.me.storageUsedOf(fmtMb(usedBytes), `${storageLimitMb} MB`)
      : t.me.storageUsed(fmtMb(usedBytes));
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const origin = `${proto}://${host}`;

  const initial = guest.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="flex flex-1 flex-col">
      <GuestPageHeader backHref={`/e/${slug}/feed`} title={t.me.title} />

      <div className="mx-auto w-full max-w-sm flex-1 space-y-5 px-4 py-7 sm:px-6">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl text-foreground">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{t.me.youreInAs}</p>
            <p className="truncate font-display text-2xl leading-tight">{guest.displayName}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{t.me.atEvent(event?.name ?? slug)}</p>
            {usedBytes > 0 && (
              <p className="mt-1 truncate text-xs text-muted-foreground/70">{storageLabel}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg">{t.me.keepYourSpot}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t.me.recoveryIntro(guest.displayName)}
          </p>
          <div className="mt-5">
            <RecoverySection slug={slug} origin={origin} />
          </div>
        </div>

        <MyPhotosGrid slug={slug} initialPhotos={myPhotoItems} eventTags={event?.tags ?? []} />
      </div>
    </main>
  );
}
