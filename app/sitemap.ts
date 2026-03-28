import type { MetadataRoute } from "next";
import { serviceLandingPages } from "@/lib/service-landing-pages";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "/", priority: 1 },
    { path: "/tjenester", priority: 0.95 },
    { path: "/om-oss", priority: 0.7 },
    { path: "/kontakt", priority: 0.8 },
    { path: "/airbnb", priority: 0.9 },
    { path: "/support", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];

  const now = new Date();

  return [
    ...staticRoutes.map((route) => ({
      url: new URL(route.path, siteConfig.url).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    ...serviceLandingPages.map((page) => ({
      url: new URL(page.path, siteConfig.url).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
