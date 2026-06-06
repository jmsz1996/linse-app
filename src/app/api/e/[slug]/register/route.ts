import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import {
  generateToken,
  hashToken,
  makeGuestCookieOptions,
  isGuestBlockedByCookie,
} from "@/lib/guest-session";
import { guestCookieName } from "@/lib/guest-constants";
import { registerGuestSchema } from "@/lib/schemas/guest";
import { isGatePassed } from "@/lib/event-gate";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { slug } = await params;

  if (await isGuestBlockedByCookie(slug)) {
    return Response.json({ error: "You have been removed from this event." }, { status: 403 });
  }

  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, accessPassword: true },
  });
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  // Password-gated events require unlocking first (signed gate cookie). Blocks
  // POSTing register directly, bypassing the password prompt.
  if (event.accessPassword && !(await isGatePassed(slug, event.id))) {
    return Response.json({ error: "Password required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerGuestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  let guest: { id: string };
  try {
    guest = await prisma.guest.create({
      data: { eventId: event.id, displayName: parsed.data.displayName, tokenHash },
      select: { id: true },
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json({ error: "Token collision, please retry" }, { status: 500 });
    }
    throw err;
  }

  const jar = await cookies();
  jar.set(guestCookieName(slug), token, makeGuestCookieOptions());

  return Response.json({ recoveryToken: token, guestId: guest.id }, { status: 201 });
}
