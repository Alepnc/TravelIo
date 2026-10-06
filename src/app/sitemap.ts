import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/server/mock-data/destinations";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = ["", "/ispirazione", "/prezzi", "/cerca"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.7 : 1 }));
  return [...pages, ...DESTINATIONS.map((d) => ({ url: `${base}/destinazioni/${d.id}`, changeFrequency: "monthly" as const, priority: 0.8 }))];
}
