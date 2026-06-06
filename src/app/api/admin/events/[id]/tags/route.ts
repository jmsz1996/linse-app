import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTagSchema } from "@/lib/schemas/tag";

export const dynamic = "force-dynamic";

async function verifyEventOwnership(eventId: string, userId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, hostUserId: userId },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await verifyEventOwnership(id, userId);
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const tags = await prisma.tag.findMany({
    where: { eventId: id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return Response.json({ tags });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await verifyEventOwnership(id, userId);
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const tag = await prisma.tag.create({
      data: { ...parsed.data, eventId: id },
    });
    return Response.json({ tag }, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "Tag label already exists for this event" },
        { status: 409 }
      );
    }
    throw err;
  }
}
