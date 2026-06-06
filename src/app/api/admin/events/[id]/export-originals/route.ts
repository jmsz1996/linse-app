import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exportEventOriginals } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ mode: z.enum(["copy", "move"]) });

// Host-only. Copies this event's original media into EXPORT_DIR/<event name>/.
// mode "move" additionally removes the exported originals from the app.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    select: { id: true, name: true, slug: true },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await exportEventOriginals({
      eventId: event.id,
      eventName: event.name,
      slug: event.slug,
      mode: parsed.data.mode,
    });
    return Response.json({ mode: parsed.data.mode, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
