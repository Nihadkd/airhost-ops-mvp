import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/airbnb", "/om-oss", "/kontakt", "/privacy", "/support", "/terms", "/tjenester", "/tjenester/"],
        disallow: [
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/dashboard",
          "/messages",
          "/orders/new",
          "/orders/my",
          "/settings",
          "/profile",
          "/admin",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
