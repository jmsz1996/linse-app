import { getGuestFromCookie } from "@/lib/guest-session";
import { eventBus, type NewPhotoPayload, type NewCommentPayload } from "@/lib/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const guest = await getGuestFromCookie(slug);
  if (!guest) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const enc = new TextEncoder();

  let heartbeat: ReturnType<typeof setInterval>;
  let photoListener: (p: NewPhotoPayload) => void;
  let commentListener: (p: NewCommentPayload) => void;

  const stream = new ReadableStream({
    start(controller) {
      const send = (s: string) => {
        try { controller.enqueue(enc.encode(s)); } catch { /* controller closed */ }
      };

      send(": heartbeat\n\n");
      heartbeat = setInterval(() => send(": heartbeat\n\n"), 25_000);

      photoListener = (p) => {
        if (p.slug !== slug) return;
        send(`event: new_photo\ndata: ${JSON.stringify(p)}\n\n`);
      };
      commentListener = (p) => {
        if (p.slug !== slug) return;
        send(`event: new_comment\ndata: ${JSON.stringify(p)}\n\n`);
      };

      eventBus.on("new_photo", photoListener);
      eventBus.on("new_comment", commentListener);
    },
    cancel() {
      clearInterval(heartbeat);
      eventBus.off("new_photo", photoListener);
      eventBus.off("new_comment", commentListener);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
