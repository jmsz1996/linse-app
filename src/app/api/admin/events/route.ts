import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEventSchema } from "@/lib/schemas/event";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const events = await prisma.event.findMany({
    where: { hostUserId: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tags: true, photos: true } } },
  });

  return Response.json({ events });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.event.create({
      data: { ...parsed.data, hostUserId: userId },
    });
    return Response.json({ event }, { status: 201 });
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
