import { randomUUID, createHash } from "crypto";
import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { processImage } from "@/lib/image";
import { processVideo } from "@/lib/video";
import { writeStorageFile, originalRelPath, thumbRelPath, storagePath } from "@/lib/storage";
import { uploadPhotoSchema } from "@/lib/schemas/photo";
import { eventBus } from "@/lib/event-bus";
import { assertSameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get("tagId") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const event = await prisma.event.findFirst({ where: { slug }, select: { id: true } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: {
      eventId: event.id,
      hiddenAt: null,
      ...(tagId ? { photoTags: { some: { tagId } } } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      guest: { select: { displayName: true } },
      photoTags: { include: { tag: { select: { id: true, label: true, color: true } } } },
    },
  });

  const hasMore = photos.length > limit;
  return Response.json({
    photos: photos.slice(0, limit),
    nextCursor: hasMore ? photos[limit - 1].id : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, storageLimitMb: true, allowVideos: true },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const rawTagIds = form.getAll("tagIds").map(String);
  const parsed = uploadPhotoSchema.safeParse({ tagIds: rawTagIds });
  if (!parsed.success) {
    return Response.json({ error: "Invalid tag data" }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  if (isVideo && !event.allowVideos) {
    return Response.json({ error: "Video uploads aren't enabled for this event." }, { status: 400 });
  }

  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    processed = isVideo ? await processVideo(buffer, file.type) : await processImage(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    return Response.json({ error: msg }, { status: 400 });
  }

  // Skip duplicates: if the identical file already lives in this event's feed, keep
  // the first copy and short-circuit — no new storage, no quota hit, no feed event.
  // Soft-enforced like the quota below: two identical files racing in can still both
  // land, which is acceptable here. Hidden/moderated copies don't block a re-upload.
  const contentHash = createHash("sha256").update(processed.originalBuffer).digest("hex");
  const existing = await prisma.photo.findFirst({
    where: { eventId: event.id, contentHash, hiddenAt: null },
    orderBy: { uploadedAt: "asc" },
    select: { id: true },
  });
  if (existing) {
    return Response.json({ photoId: existing.id, duplicate: true });
  }

  // Per-guest storage cap (0 = unlimited). Soft-enforced: concurrent uploads can
  // slightly overrun, which is acceptable for this use case.
  const fileSize = processed.originalBuffer.length;
  if (event.storageLimitMb > 0) {
    const agg = await prisma.photo.aggregate({
      where: { eventId: event.id, guestId: guest.id },
      _sum: { fileSize: true },
    });
    const usedBytes = agg._sum.fileSize ?? 0;
    if (usedBytes + fileSize > event.storageLimitMb * 1024 * 1024) {
      return Response.json({ error: "You've reached your storage limit for this event." }, { status: 507 });
    }
  }

  const photoId = randomUUID();
  const origRel = originalRelPath(event.id, photoId, processed.ext);
  const tRel = thumbRelPath(event.id, photoId);
  const origStoragePath = storagePath(...origRel);
  const thumbStoragePath = storagePath(...tRel);

  await Promise.all([
    writeStorageFile(origRel, processed.originalBuffer),
    writeStorageFile(tRel, processed.thumbBuffer),
  ]);

  const photo = await prisma.photo.create({
    data: {
      id: photoId,
      eventId: event.id,
      guestId: guest.id,
      storagePath: origStoragePath,
      thumbPath: thumbStoragePath,
      width: processed.width,
      height: processed.height,
      mimeType: processed.mimeType,
      fileSize,
      contentHash,
    },
    select: { id: true },
  });

  if (parsed.data.tagIds.length > 0) {
    // Verify tags belong to this event before linking
    const validTags = await prisma.tag.findMany({
      where: { id: { in: parsed.data.tagIds }, eventId: event.id },
      select: { id: true },
    });
    if (validTags.length > 0) {
      await prisma.photoTag.createMany({
        data: validTags.map((t) => ({ photoId: photo.id, tagId: t.id })),
        skipDuplicates: true,
      });
    }
  }

  eventBus.emitEvent({ type: "new_photo", payload: { slug, photoId: photo.id } });

  return Response.json({ photoId: photo.id }, { status: 201 });
}
