import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://adsentify.com";
const SITE_NAME = "Adsentify";

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
  /** Override OG image type label: blog | compare | tool | guide | default */
  ogType?: string;
}

export function buildMetadata(opts: PageSeoOptions): Metadata {
  const ogType = opts.ogType ?? (opts.type === "article" ? "blog" : "default");
  const ogImage =
    opts.image ??
    `${BASE_URL}/api/og?${new URLSearchParams({
      title: opts.title,
      description: opts.description.slice(0, 120),
      type: ogType,
    }).toString()}`;

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
      site: "@adsentifyio",
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      images: [ogImage],
    },
  };
}

// ── JSON-LD: Organization ─────────────────────────────────────────────────────
// Establishes brand entity for AI knowledge graphs and search engines

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      "@id": `${BASE_URL}/#logo`,
      url: `${BASE_URL}/logo.png`,
      contentUrl: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
      caption: SITE_NAME,
    },
    sameAs: ["https://twitter.com/adsentifyio"],
    description:
      "AI-powered ad intelligence platform. Track viral velocity across TikTok, Meta, YouTube and more. Spot breakout creatives in 48 hours, deconstruct them with AI, and forge better ads faster.",
    foundingDate: "2025",
    email: "hello@adsentify.com",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@adsentify.com",
      availableLanguage: "English",
    },
  };
}

// ── JSON-LD: WebSite ──────────────────────────────────────────────────────────
// Enables sitelinks search box; signals brand authority

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: SITE_NAME,
    url: BASE_URL,
    publisher: { "@id": `${BASE_URL}/#organization` },
    description:
      "AI-powered ad intelligence platform. Find winning ads before your competitors with real-time velocity scoring, AI X-Ray analysis, and creative brief generation.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/discover?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-US",
  };
}

// ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────────

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── JSON-LD: HowTo ────────────────────────────────────────────────────────────
// Answer Engine Optimization for process/workflow queries

export function howToSchema(opts: {
  name: string;
  description: string;
  steps: { name: string; text: string; url?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    publisher: { "@id": `${BASE_URL}/#organization` },
    step: opts.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
    })),
  };
}

// ── JSON-LD: SoftwareApplication ──────────────────────────────────────────────
// Enhanced with full feature list, pricing, and reviews

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Intelligence",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    description:
      "AI-powered ad intelligence platform. Track viral velocity across TikTok, Meta, YouTube and more. Spot breakout creatives in 48 hours, deconstruct them with AI, and forge better ads faster.",
    url: BASE_URL,
    screenshot: `${BASE_URL}/og-image.png`,
    featureList: [
      "Real-time velocity scoring updated every 30 minutes",
      "AI X-Ray ad deconstruction powered by Anthropic Claude",
      "2M+ ad database across TikTok, Meta, YouTube, Google Ads, Pinterest, Snapchat",
      "One-click creative brief generation",
      "Velocity alert system with configurable email notifications",
      "Trend forecasting 2–3 weeks ahead",
      "Hook and script remix engine",
      "Saturation detection and market overlap analysis",
      "Product lifecycle tracking",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        description: "10 ad searches per day, basic previews, platform filter — no credit card required.",
        price: "0",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Pro Plan",
        description: "Unlimited searches, 50 AI credits/month, AI X-Ray analysis, creative brief generator, 5 velocity alerts.",
        price: "59",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Scale Plan",
        description: "Unlimited AI credits, 20 velocity alerts, bulk CSV and brief export, 5 team seats.",
        price: "149",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Agency Plan",
        description: "50 velocity alerts, 15 team seats, white-label reports.",
        price: "299",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${BASE_URL}/#pricing`,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "340",
      bestRating: "5",
      worstRating: "1",
    },
    review: [
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        author: { "@type": "Person", name: "Jordan Kim", jobTitle: "Creative Director" },
        reviewBody:
          "Adsentify completely changed how we do creative strategy. We spotted a skincare ad going viral on Tuesday morning — by Friday we had our own version running. ROAS was 4.2x.",
      },
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        author: { "@type": "Person", name: "Priya Mehta", jobTitle: "Head of Performance" },
        reviewBody:
          "The velocity scoring is genuinely useful. Other tools just show you what's trending — Adsentify shows you what's ABOUT to trend. That 48-hour window is everything in paid social.",
      },
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        author: { "@type": "Person", name: "Marcus Webb", jobTitle: "Media Buyer" },
        reviewBody:
          "I cancelled my Minea and MagicBrief subscriptions the same week I signed up for Adsentify. The AI X-Ray alone is worth the price — it's like having a senior creative strategist on call.",
      },
    ],
    publisher: { "@id": `${BASE_URL}/#organization` },
    creator: { "@id": `${BASE_URL}/#organization` },
  };
}

// ── JSON-LD: BlogPosting ──────────────────────────────────────────────────────
// Enhanced with image, publisher logo, and blog membership

export function blogPostSchema(post: {
  title: string;
  description: string;
  slug: string;
  date: string;
  authorName: string;
  image?: string;
}) {
  const ogImage = `${BASE_URL}/api/og?${new URLSearchParams({
    title: post.title,
    description: post.description.slice(0, 120),
    type: "blog",
  }).toString()}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": canonical(`/blog/${post.slug}#article`),
    headline: post.title,
    description: post.description,
    url: canonical(`/blog/${post.slug}`),
    datePublished: post.date,
    dateModified: post.date,
    image: post.image ?? ogImage,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "Blog",
      "@id": `${BASE_URL}/blog#blog`,
      name: `${SITE_NAME} Blog`,
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
    author: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: post.authorName,
      url: BASE_URL,
    },
    publisher: {
      "@id": `${BASE_URL}/#organization`,
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical(`/blog/${post.slug}`),
    },
  };
}

// ── JSON-LD: FAQPage ──────────────────────────────────────────────────────────
// Answer Engine Optimization — helps AI engines surface direct answers

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
        url: `${BASE_URL}/#faq`,
      },
    })),
  };
}
