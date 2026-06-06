import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  } catch {
    return new Response("db unavailable", {
      status: 503,
      headers: { "content-type": "text/plain" },
    });
  }
}
