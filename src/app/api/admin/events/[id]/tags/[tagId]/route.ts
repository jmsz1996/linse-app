import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateTagSchema } from "@/lib/schemas/tag";

export const dynamic = "force-dynamic";

async function verifyTagOwnership(tagId: string, eventId: string, userId: string) {
  return prisma.tag.findFirst({
    where: { id: tagId, eventId, event: { hostUserId: userId } },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, tagId } = await params;

  const existing = await verifyTagOwnership(tagId, id, userId);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const tag = await prisma.tag.update({ where: { id: tagId }, data: parsed.data });
    return Response.json({ tag });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, tagId } = await params;

  const existing = await verifyTagOwnership(tagId, id, userId);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.tag.delete({ where: { id: tagId } });
  return new Response(null, { status: 204 });
}
