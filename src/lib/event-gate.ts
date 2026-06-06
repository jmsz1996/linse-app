import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// A short-lived signed cookie that records "this browser entered the event
// password". It only guards the gap between unlocking and registering (and the
// recovery flow) — once a guest registers, the long-lived guest session cookie
// is the authority. HMAC-signed with LINSE_SECRET so it can't be forged.
const GATE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export function gateCookieName(slug: string): string {
  return `linse_gate_${slug}`;
}

function gateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(GATE_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production" && process.env.LINSE_INSECURE_COOKIES !== "true",
  };
}

function sign(payload: string): string {
  return createHmac("sha256", env.LINSE_SECRET).update(payload).digest("hex");
}

// Token shape: `${eventId}.${issuedAtMs}.${hmac}` — bound to the event so a gate
// cookie from one event can't unlock another.
function makeGateToken(eventId: string): string {
  const payload = `${eventId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function verifyGateToken(token: string | undefined, eventId: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenEventId, issuedAt, mac] = parts;
  if (tokenEventId !== eventId) return false;
  const issued = Number(issuedAt);
  if (!Number.isFinite(issued) || Date.now() - issued > GATE_TTL_MS) return false;
  const expected = sign(`${tokenEventId}.${issuedAt}`);
  // Equal-length hex digests, so a plain timingSafeEqual is safe here.
  if (mac.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function isGatePassed(slug: string, eventId: string): Promise<boolean> {
  const jar = await cookies();
  return verifyGateToken(jar.get(gateCookieName(slug))?.value, eventId);
}

export async function setGateCookie(slug: string, eventId: string): Promise<void> {
  const jar = await cookies();
  jar.set(gateCookieName(slug), makeGateToken(eventId), gateCookieOptions());
}

// Timing-safe password comparison. Both sides are HMAC'd first so the inputs to
// timingSafeEqual are always equal-length (32 bytes), which also avoids leaking
// the password length through a length check.
export function passwordMatches(submitted: string, stored: string): boolean {
  const a = createHmac("sha256", env.LINSE_SECRET).update(submitted, "utf8").digest();
  const b = createHmac("sha256", env.LINSE_SECRET).update(stored, "utf8").digest();
  return timingSafeEqual(a, b);
}

// Best-effort client IP for rate limiting. Behind the Caddy overlay (or any
// reverse proxy) X-Forwarded-For is set; falls back to a constant otherwise.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
