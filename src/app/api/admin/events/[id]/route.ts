import { unlink } from "fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEventSchema } from "@/lib/schemas/event";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    include: { tags: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ event });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.event.updateMany({
      where: { id, hostUserId: userId },
      data: parsed.data,
    });
    if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

    const event = await prisma.event.findUnique({ where: { id } });
    return Response.json({ event });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json({ error: "Slug already in use" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const photos = await prisma.photo.findMany({
    where: { eventId: id, event: { hostUserId: userId } },
    select: { storagePath: true, thumbPath: true },
  });

  const result = await prisma.event.deleteMany({ where: { id, hostUserId: userId } });
  if (result.count === 0) return Response.json({ error: "Not found" }, { status: 404 });

  await Promise.allSettled(
    photos.flatMap((p) => [unlink(p.storagePath).catch(() => {}), unlink(p.thumbPath).catch(() => {})])
  );

  return new Response(null, { status: 204 });
}
