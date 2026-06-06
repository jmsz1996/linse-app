import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { streamPhotosZip } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ZIP = 500;

// GET so the browser streams the archive straight to disk (native download).
// Host-only: unlike the guest route this includes hidden photos — the admin
// downloads everything they ask for; the `ids` scope it to this event.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    select: { id: true, slug: true },
  });
  if (!event) return new Response("Not found", { status: 404 });

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_ZIP) {
    return new Response("Bad Request", { status: 400 });
  }

  // Scope to this event; foreign/other-event ids are dropped.
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, eventId: event.id },
    select: { id: true, mimeType: true },
    orderBy: { uploadedAt: "asc" },
  });
  if (photos.length === 0) return new Response("Not found", { status: 404 });

  return streamPhotosZip({ photos, eventId: event.id, filenamePrefix: event.slug });
}
