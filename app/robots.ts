import type { MetadataRoute } from "next";
import { canonicalAppUrl } from "@/lib/publicPledgeMetadata";

// Only the marketing homepage is public content. Everything else is either the
// authenticated dashboard or a private per-guest/per-contributor token route
// (invite/[token], r/[token], support/[token], meeting-map/[token],
// contributions/manage/[token]) that must never be crawled or indexed. Rather
// than enumerate every private route (and risk missing a new one later),
// disallow everything and explicitly allow only the exact root URL — "Allow: /$"
// is more specific than "Disallow: /" and wins for that one path.
export default function robots(): MetadataRoute.Robots {
  const base = canonicalAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/$"],
      disallow: ["/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
