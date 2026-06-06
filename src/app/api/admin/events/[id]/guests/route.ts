import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({ where: { id, hostUserId: userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const guests = await prisma.guest.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      blockedAt: true,
      _count: { select: { photos: true, comments: true } },
    },
  });

  return Response.json({ guests });
}
