import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken, makeGuestCookieOptions } from "@/lib/guest-session";
import { guestCookieName } from "@/lib/guest-constants";
import { isGatePassed } from "@/lib/event-gate";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const t = searchParams.get("t");

  // Use forwarding headers so redirects go to the public-facing host/port,
  // not the container-internal localhost:3000.
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const base = `${proto}://${host}`;

  if (!t || !/^[0-9a-f]{64}$/.test(t)) {
    return NextResponse.redirect(`${base}/e/${slug}?recovered=0`);
  }

  const guest = await prisma.guest.findFirst({
    where: { tokenHash: hashToken(t), blockedAt: null, event: { slug } },
    select: { id: true, eventId: true, event: { select: { accessPassword: true } } },
  });

  if (!guest) {
    return NextResponse.redirect(`${base}/e/${slug}?recovered=0`);
  }

  // Password-gated events: require the password before restoring a session on a
  // new device. Carry the recovery token to the entry screen in the hash (never
  // logged); PasswordGate re-invokes this endpoint once the password is accepted.
  if (guest.event.accessPassword && !(await isGatePassed(slug, guest.eventId))) {
    return NextResponse.redirect(`${base}/e/${slug}#rt=${t}`);
  }

  // Pass the token via URL hash so the new browser can stash it in localStorage.
  // Hash fragments are never sent to the server (no logs, no referrer leakage).
  const response = NextResponse.redirect(`${base}/e/${slug}/feed#rt=${t}`);
  response.cookies.set(guestCookieName(slug), t, makeGuestCookieOptions());
  return response;
}
