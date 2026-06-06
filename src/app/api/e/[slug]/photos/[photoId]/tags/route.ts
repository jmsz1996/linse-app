import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import { uploadPhotoSchema } from "@/lib/schemas/photo";

export const dynamic = "force-dynamic";

// A guest replaces the full tag set on their OWN photo. Body: { tagIds: string[] }.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug, photoId } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = uploadPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid tag data" }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: guest.eventId, guestId: guest.id },
    select: { id: true },
  });
  if (!photo) return Response.json({ error: "Not found" }, { status: 404 });

  // Only tags that actually belong to this event can be linked.
  const validTags = await prisma.tag.findMany({
    where: { id: { in: parsed.data.tagIds }, eventId: guest.eventId },
    select: { id: true, label: true, color: true },
  });

  await prisma.$transaction([
    prisma.photoTag.deleteMany({ where: { photoId } }),
    ...(validTags.length > 0
      ? [
          prisma.photoTag.createMany({
            data: validTags.map((t) => ({ photoId, tagId: t.id })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  return Response.json({ tags: validTags });
}
