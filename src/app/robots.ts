import type { MetadataRoute } from "next";

// Events can be exposed to the internet but are private (password-gated), so we
// ask crawlers to stay out entirely. Paired with the X-Robots-Tag headers in
// next.config.ts for engines that ignore robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: ["/e/", "/admin/", "/api/"] },
  };
}
