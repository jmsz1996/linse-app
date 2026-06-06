import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug, photoId } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id, hiddenAt: null },
    select: { id: true },
  });
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

  let liked: boolean;
  try {
    await prisma.like.create({ data: { photoId, guestId: guest.id } });
    liked = true;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      await prisma.like.delete({
        where: { photoId_guestId: { photoId, guestId: guest.id } },
      });
      liked = false;
    } else {
      throw err;
    }
  }

  const count = await prisma.like.count({ where: { photoId } });
  return Response.json({ liked, count });
}
