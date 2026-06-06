import { getGuestFromCookie } from "@/lib/guest-session";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";
import { commentSchema } from "@/lib/schemas/comment";
import { assertSameOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function resolveContext(slug: string, photoId: string) {
  const guest = await getGuestFromCookie(slug);
  if (!guest) return { error: "Unauthorized", status: 401 } as const;
  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, commentLimitPerHour: true },
  });
  if (!event) return { error: "Not found", status: 404 } as const;
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, eventId: event.id, hiddenAt: null },
    select: { id: true },
  });
  if (!photo) return { error: "Not found", status: 404 } as const;
  return { guest, event, photo };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const { slug, photoId } = await params;
  const ctx = await resolveContext(slug, photoId);
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

  const comments = await prisma.comment.findMany({
    where: { photoId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      guest: { select: { displayName: true } },
    },
  });

  return Response.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; photoId: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug, photoId } = await params;
  const ctx = await resolveContext(slug, photoId);
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });
  const { guest } = ctx;

  const rl = checkRateLimit(`comment:${guest.id}`, ctx.event.commentLimitPerHour, 3_600_000);
  if (!rl.allowed) {
    return Response.json(
      { error: "Comment limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: { photoId, guestId: guest.id, body: parsed.data.body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      guest: { select: { displayName: true } },
    },
  });

  eventBus.emitEvent({
    type: "new_comment",
    payload: {
      slug,
      photoId,
      commentId: comment.id,
      authorName: comment.guest.displayName,
      body: comment.body,
    },
  });

  return Response.json({ comment }, { status: 201 });
}
