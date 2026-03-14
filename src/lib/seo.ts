import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adforge.io";
const SITE_NAME = "AdForge";

// ── Canonical URL builder ─────────────────────────────────────────────────────

export function canonical(path: string): string {
  return `${BASE_URL}${path}`;
}

// ── Shared metadata builder ───────────────────────────────────────────────────

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  publishedAt?: string;
  type?: "website" | "article";
}

export function buildMetadata(opts: PageSeoOptions): Metadata {
  const ogImage = opts.image ?? `${BASE_URL}/og-image.png`;

  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: {
      canonical: opts.path,
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: opts.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: canonical(opts.path),
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: opts.title }],
      ...(opts.publishedAt && { publishedTime: opts.publishedAt }),
    },
    twitter: {
      card: "summary_large_image",
      site: "@adforgeio",
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      images: [ogImage],
    },
  };
}

// ── JSON-LD helpers ───────────────────────────────────────────────────────────

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered ad intelligence platform. Track viral velocity across TikTok, Meta, YouTube and more. Find winning ads before your competitors do.",
    url: BASE_URL,
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro", price: "59", priceCurrency: "USD" },
      { "@type": "Offer", name: "Scale", price: "149", priceCurrency: "USD" },
      { "@type": "Offer", name: "Agency", price: "299", priceCurrency: "USD" },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "340",
      bestRating: "5",
    },
  };
}

export function blogPostSchema(post: {
  title: string;
  description: string;
  slug: string;
  date: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: canonical(`/blog/${post.slug}`),
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.authorName,
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical(`/blog/${post.slug}`),
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
