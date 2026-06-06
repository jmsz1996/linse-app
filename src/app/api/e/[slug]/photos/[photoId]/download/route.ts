import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { readStorageFile, originalRelPath } from "@/lib/storage";
import { extFromMime } from "@/lib/mime";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const { slug, photoId } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return new Response("Unauthorized", { status: 401 });

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true } });
  if (!event) return new Response("Not found", { status: 404 });

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id, hiddenAt: null },
    select: { mimeType: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const ext = extFromMime(photo.mimeType);

  try {
    const buffer = await readStorageFile(originalRelPath(event.id, photoId, ext));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": `attachment; filename="photo.${ext}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
