import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { passwordMatches, setGateCookie, clientIp } from "@/lib/event-gate";

export const dynamic = "force-dynamic";

// Brute-force protection: cap attempts per event+IP. In-memory/per-process
// (resets on restart) — fine for the single-container deployment.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug } = await params;

  const rl = checkRateLimit(`unlock:${slug}:${clientIp(request)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, accessPassword: true },
  });
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  // No password configured → nothing to unlock; succeed idempotently.
  if (!event.accessPassword) {
    await setGateCookie(slug, event.id);
    return Response.json({ ok: true });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";

  if (!passwordMatches(password, event.accessPassword)) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  await setGateCookie(slug, event.id);
  return Response.json({ ok: true });
}
