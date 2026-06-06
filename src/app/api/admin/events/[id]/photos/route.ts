import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deletePhotoFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { eventId: id },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      thumbPath: true,
      uploadedAt: true,
      guestId: true,
      hiddenAt: true,
      guest: { select: { displayName: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return Response.json({ photos });
}

// Bulk permanent delete: rows (cascade to tags/likes/comments) + stored files.
// Scoped to this event so foreign ids are ignored.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: parsed.data.ids }, eventId: id },
    select: { id: true, storagePath: true, thumbPath: true },
  });
  if (photos.length === 0) return Response.json({ deleted: 0 });

  await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });

  // Best-effort file cleanup after the rows are gone.
  await Promise.allSettled(photos.map((p) => deletePhotoFiles(p.storagePath, p.thumbPath)));

  return Response.json({ deleted: photos.length });
}
