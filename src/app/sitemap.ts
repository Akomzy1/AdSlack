import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adslack.com";

const COMPETITORS = ["pipiads", "bigspy", "adspy", "minea"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const vsUrls: MetadataRoute.Sitemap = COMPETITORS.map((slug) => ({
    url: `${BASE_URL}/vs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [
    // Core pages
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tools/free-ad-library`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    // Legal — low priority but required for trust signals
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-03-14"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date("2026-03-14"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Blog posts and comparison pages
    ...postUrls,
    ...vsUrls,
  ];
}
