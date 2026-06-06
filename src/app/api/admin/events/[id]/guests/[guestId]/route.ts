import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["block", "unblock"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, guestId } = await params;

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
  const data = { blockedAt: action === "block" ? new Date() : null };

  const result = await prisma.guest.updateMany({
    where: { id: guestId, eventId: id },
    data,
  });

  if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { id: true, blockedAt: true },
  });

  return Response.json({ guest });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, guestId } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId: id } });
  if (!guest) return Response.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { guestId, eventId: id },
    select: { storagePath: true, thumbPath: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.photo.deleteMany({ where: { guestId, eventId: id } });
    await tx.guest.delete({ where: { id: guestId } });
  });

  // Best-effort file cleanup after DB transaction succeeds
  await Promise.allSettled(
    photos.flatMap((p) => [
      unlink(p.storagePath).catch(() => {}),
      unlink(p.thumbPath).catch(() => {}),
    ])
  );

  return Response.json({ ok: true });
}
