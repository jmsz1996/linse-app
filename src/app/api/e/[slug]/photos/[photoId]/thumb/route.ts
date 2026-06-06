import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { readStorageFile, thumbRelPath } from "@/lib/storage";

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
    select: { id: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  try {
    const buffer = await readStorageFile(thumbRelPath(event.id, photoId));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
