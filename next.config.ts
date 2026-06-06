import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Pragmatic CSP. Next's App Router injects inline bootstrap scripts and the app
// uses inline `style` (theme accent dots), so 'unsafe-inline' is required and
// there is no nonce infrastructure. Dev (Turbopack HMR) additionally needs
// 'unsafe-eval' and websocket connections, so CSP is only emitted in production.
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'", // same-origin SSE stream
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS is only honored over TLS (e.g. behind the Caddy overlay); ignored on plain HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...(isProd ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  // Dev only: allow access from non-localhost devices (e.g. another machine on your LAN/VPN).
  // Set NEXTJS_DEV_ORIGINS=192.168.1.x,10.0.0.y (comma-separated) in your local .env.
  allowedDevOrigins: process.env.NEXTJS_DEV_ORIGINS
    ? process.env.NEXTJS_DEV_ORIGINS.split(",").map((s) => s.trim())
    : [],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Guest event pages and their APIs may be exposed to the internet; keep
      // them out of search engines (defense-in-depth alongside robots.ts).
      {
        source: "/e/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/e/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
