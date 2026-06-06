import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readStorageFile, thumbRelPath, deletePhotoFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // "delete" is permanent (row + files). "hide"/"unhide" are reversible.
  action: z.enum(["hide", "unhide", "delete"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, photoId } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.photo.findFirst({ where: { id: photoId, eventId: id } });
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const buf = await readStorageFile(thumbRelPath(event.id, photoId));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, photoId } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action } = parsed.data;

  if (action === "delete") {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, eventId: id },
      select: { storagePath: true, thumbPath: true },
    });
    if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

    // Permanent: row (cascades to tags/likes/comments) + files.
    await prisma.photo.delete({ where: { id: photoId } });
    await deletePhotoFiles(photo.storagePath, photo.thumbPath);

    return Response.json({ deleted: true });
  }

  const result = await prisma.photo.updateMany({
    where: { id: photoId, eventId: id },
    data: { hiddenAt: action === "hide" ? new Date() : null },
  });

  if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, hiddenAt: true },
  });

  return Response.json({ photo });
}
