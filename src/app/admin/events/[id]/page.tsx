import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditEventDialog } from "@/components/admin/edit-event-dialog";
import { TagManager } from "@/components/admin/tag-manager";
import { PhotoModerationGrid } from "@/components/admin/photo-moderation-grid";
import { GuestList } from "@/components/admin/guest-list";
import { DeleteEventButton } from "@/components/admin/delete-event-button";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/admin");
  const userId = (session.user as { id: string }).id;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    include: { tags: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) notFound();

  const [photos, storageAgg, guests] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId: id },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        uploadedAt: true,
        guestId: true,
        hiddenAt: true,
        guest: { select: { displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.photo.aggregate({
      where: { eventId: id },
      _sum: { fileSize: true },
    }),
    prisma.guest.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        blockedAt: true,
        _count: { select: { photos: true, comments: true } },
      },
    }),
  ]);

  const usedMb = (storageAgg._sum.fileSize ?? 0) / (1024 * 1024);

  const editValues = {
    id: event.id,
    name: event.name,
    slug: event.slug,
    startsAt: event.startsAt ? event.startsAt.toISOString() : null,
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    storageLimitMb: event.storageLimitMb,
    allowVideos: event.allowVideos,
    commentLimitPerHour: event.commentLimitPerHour,
    description: event.description,
    footer: event.footer,
    accessPassword: event.accessPassword,
  };

  return (
    <main className="flex flex-1 flex-col p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* Event info */}
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{event.name}</h1>
          <div className="text-sm font-mono text-muted-foreground">
            <Badge variant="outline" className="font-mono text-xs">
              /e/{event.slug}
            </Badge>
          </div>
          {(event.startsAt || event.endsAt) && (
            <p className="text-sm text-muted-foreground">
              {event.startsAt && formatDate(event.startsAt)}
              {event.startsAt && event.endsAt && " → "}
              {event.endsAt && formatDate(event.endsAt)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {usedMb.toFixed(usedMb < 10 ? 1 : 0)} MB used
            {event.storageLimitMb > 0
              ? ` · ${event.storageLimitMb} MB cap per guest`
              : " · unlimited"}
            {event.allowVideos && " · videos on"}
          </p>
        </div>
        <div className="shrink-0">
          <EditEventDialog event={editValues} />
        </div>
      </section>

      <Separator className="my-8" />

      {/* Tags */}
      <TagManager
        eventId={event.id}
        initialTags={event.tags.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          sortOrder: t.sortOrder,
        }))}
      />

      <Separator className="my-8" />

      {/* QR code */}
      <section>
        <h2 className="text-base font-semibold mb-4">Guest QR code</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Guests scan this to open the event on their phone. The code links to{" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            /e/{event.slug}
          </code>
        </p>

        {event.accessPassword ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Password protected
            </Badge>
            <span className="text-muted-foreground">
              Password{" "}
              <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {event.accessPassword}
              </code>{" "}
              is embedded in the QR — scanning unlocks automatically. Treat the QR like the
              password.
            </span>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Public</Badge>
            <span>Anyone with the link can join. Set an access password in Edit to lock it.</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white">
            <Image
              src={`/api/admin/events/${event.id}/qrcode`}
              alt={`QR code for ${event.name}`}
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <div className="space-y-3">
            <Button asChild variant="outline">
              <a
                href={`/api/admin/events/${event.id}/qrcode`}
                download={`qr-${event.slug}.png`}
              >
                Download PNG
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      <PhotoModerationGrid
        eventId={event.id}
        initialPhotos={photos.map((p) => ({
          ...p,
          uploadedAt: p.uploadedAt.toISOString(),
          hiddenAt: p.hiddenAt?.toISOString() ?? null,
        }))}
      />

      <Separator className="my-8" />

      <GuestList
        eventId={event.id}
        initialGuests={guests.map((g) => ({
          ...g,
          createdAt: g.createdAt.toISOString(),
          blockedAt: g.blockedAt?.toISOString() ?? null,
        }))}
      />

      <Separator className="my-8" />

      <section>
        <h2 className="text-base font-semibold mb-1">Danger zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete this event and all its photos, guests, and comments.
        </p>
        <DeleteEventButton eventId={event.id} eventName={event.name} />
      </section>
    </main>
  );
}
