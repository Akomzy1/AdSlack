import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adslack.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all public pages, block private/API routes
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/(dashboard)/", "/dashboard/"],
      },
      // OpenAI — explicitly allow for GEO/AEO indexing
      {
        userAgent: "GPTBot",
        allow: ["/", "/blog/", "/vs/", "/tools/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/"],
      },
      // Anthropic web crawler
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      // Perplexity AI
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      // Google Gemini / AI Overviews training
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      // Apple AI
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
      // Meta AI
      {
        userAgent: "FacebookBot",
        allow: ["/", "/blog/", "/vs/", "/tools/"],
        disallow: ["/api/", "/dashboard/"],
      },
      // Cohere
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
