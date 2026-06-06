import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { guestCookieName } from "@/lib/guest-constants";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function makeGuestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.NODE_ENV === "production" && process.env.LINSE_INSECURE_COOKIES !== "true",
  };
}

export async function getGuestFromCookie(slug: string): Promise<{
  id: string;
  displayName: string;
  eventId: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(guestCookieName(slug))?.value;
  if (!raw) return null;
  const hash = hashToken(raw);
  return prisma.guest.findFirst({
    where: { tokenHash: hash, blockedAt: null, event: { slug } },
    select: { id: true, displayName: true, eventId: true },
  });
}

export async function isGuestBlockedByCookie(slug: string): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(guestCookieName(slug))?.value;
  if (!raw) return false;
  const hash = hashToken(raw);
  const guest = await prisma.guest.findFirst({
    where: { tokenHash: hash, event: { slug } },
    select: { blockedAt: true },
  });
  return guest !== null && guest.blockedAt !== null;
}
