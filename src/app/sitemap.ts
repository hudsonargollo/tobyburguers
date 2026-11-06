import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/catalog";

import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/shop",
    "/about",
    "/custom",
    "/contact",
    "/shipping",
    "/care",
    "/faq",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/shop/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/product/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
