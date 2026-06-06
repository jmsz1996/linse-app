import { getGuestFromCookie } from "@/lib/guest-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { streamPhotosZip } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ZIP = 100;

// GET so the browser streams the archive straight to disk (native download,
// like the single-photo route) — no in-memory blob, no URL-revoke race.
// It's a read of the guest's own event photos, so no CSRF token is needed
// (consistent with the single-photo download route).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const guest = await getGuestFromCookie(slug);
  if (!guest) return new Response("Unauthorized", { status: 401 });

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_ZIP) {
    return new Response("Bad Request", { status: 400 });
  }

  // Bulk export is heavier than a single download; throttle per guest.
  const rl = checkRateLimit(`zip:${guest.id}`, 10, 3_600_000);
  if (!rl.allowed) {
    return new Response("Too many downloads. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true } });
  if (!event) return new Response("Not found", { status: 404 });

  // Only visible photos belonging to THIS event — foreign/hidden ids are dropped.
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, eventId: event.id, hiddenAt: null },
    select: { id: true, mimeType: true },
    orderBy: { uploadedAt: "asc" },
  });
  if (photos.length === 0) return new Response("Not found", { status: 404 });

  return streamPhotosZip({ photos, eventId: event.id, filenamePrefix: slug });
}
