import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import { deletePhotoFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

// A guest permanently deletes their OWN photo: the DB row (cascading to its
// tags, likes, and comments) and the stored files are removed for good.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug, photoId } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership is enforced by the guestId filter; fetch paths so we can unlink them.
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: guest.eventId, guestId: guest.id },
    select: { storagePath: true, thumbPath: true },
  });
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.photo.delete({ where: { id: photoId } });
  await deletePhotoFiles(photo.storagePath, photo.thumbPath);

  return Response.json({ ok: true });
}
