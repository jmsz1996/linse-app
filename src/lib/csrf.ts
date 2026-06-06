export function assertSameOrigin(request: Request): Response | null {
  const origin =
    request.headers.get("origin") ?? request.headers.get("referer");

  if (!origin) return null;

  const proto =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const expected = `${proto}://${host}`;

  const originHost = new URL(origin).origin;

  if (originHost !== expected) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
