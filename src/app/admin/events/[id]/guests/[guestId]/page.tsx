import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { GuestPhotosManager } from "@/components/admin/guest-photos-manager";

export const dynamic = "force-dynamic";

export default async function GuestPhotosPage({
  params,
}: {
  params: Promise<{ id: string; guestId: string }>;
}) {
  const { id, guestId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/admin");
  const userId = (session.user as { id: string }).id;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    select: { id: true, name: true, slug: true },
  });
  if (!event) notFound();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId: id },
    select: {
      id: true,
      displayName: true,
      blockedAt: true,
      _count: { select: { photos: true, comments: true } },
    },
  });
  if (!guest) notFound();

  const photos = await prisma.photo.findMany({
    where: { eventId: id, guestId },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, uploadedAt: true, hiddenAt: true, mimeType: true },
  });

  return (
    <main className="flex flex-1 flex-col p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <Link
          href={`/admin/events/${event.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to {event.name}
        </Link>
      </div>

      <section className="mb-8 space-y-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold truncate">{guest.displayName}</h1>
          {guest.blockedAt && (
            <Badge variant="destructive" className="text-xs">Blocked</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {guest._count.photos} photo{guest._count.photos !== 1 ? "s" : ""} ·{" "}
          {guest._count.comments} comment{guest._count.comments !== 1 ? "s" : ""}
        </p>
      </section>

      <GuestPhotosManager
        eventId={event.id}
        initialPhotos={photos.map((p) => ({
          id: p.id,
          isVideo: p.mimeType.startsWith("video/"),
          hidden: p.hiddenAt !== null,
        }))}
      />
    </main>
  );
}
