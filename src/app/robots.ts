import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/checkout",
        "/cart",
        "/api/",
        "/account",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/search",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
