import type { MetadataRoute } from "next";
import { canonicalAppUrl } from "@/lib/publicPledgeMetadata";

// Only the marketing homepage is public, indexable content — see app/robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: canonicalAppUrl(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
