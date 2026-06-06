import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, hostUserId: userId },
    select: { slug: true, accessPassword: true },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  // Embed the password in the hash fragment so scanning auto-unlocks. The hash
  // is never sent to the server (kept out of access logs / Referer headers).
  const secret = event.accessPassword
    ? `#k=${encodeURIComponent(event.accessPassword)}`
    : "";
  const guestUrl = `${proto}://${host}/e/${event.slug}${secret}`;

  const buffer = await QRCode.toBuffer(guestUrl, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#09090b", light: "#ffffff" },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${event.slug}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
