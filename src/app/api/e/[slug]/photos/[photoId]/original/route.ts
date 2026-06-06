import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { readStorageFile, originalRelPath } from "@/lib/storage";
import { extFromMime, isVideoMime } from "@/lib/mime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const { slug, photoId } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return new Response("Unauthorized", { status: 401 });

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true } });
  if (!event) return new Response("Not found", { status: 404 });

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id, hiddenAt: null },
    select: { mimeType: true, storagePath: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const ext = extFromMime(photo.mimeType);

  try {
    const buffer = await readStorageFile(originalRelPath(event.id, photoId, ext));

    // Browsers require byte-range support (HTTP 206) to play video — without it
    // the <video> element shows a crossed play button even though the file is valid.
    if (isVideoMime(photo.mimeType)) {
      const total = buffer.length;
      const rangeHeader = request.headers.get("range");

      if (rangeHeader) {
        const [, rawStart, rawEnd] = rangeHeader.match(/bytes=(\d*)-(\d*)/) ?? [];
        const start = rawStart ? parseInt(rawStart, 10) : 0;
        const end   = rawEnd   ? Math.min(parseInt(rawEnd, 10), total - 1) : total - 1;
        const chunk = buffer.slice(start, end + 1);
        return new Response(new Uint8Array(chunk), {
          status: 206,
          headers: {
            "Content-Type": photo.mimeType,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.length),
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }

      // Initial (non-range) request: advertise range support so the browser
      // immediately follows up with a ranged request.
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": photo.mimeType,
          "Accept-Ranges": "bytes",
          "Content-Length": String(total),
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
