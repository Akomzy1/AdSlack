import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "src/content/blog");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PostFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  keywords?: string[];
  coverImage?: string;
  featured?: boolean;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
}

export interface PostWithContent extends PostMeta {
  content: string;
  headings: TocHeading[];
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

// ── File utils ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractHeadings(markdown: string): TocHeading[] {
  const lines = markdown.split("\n");
  const headings: TocHeading[] = [];

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);

    if (h2) {
      const text = h2[1].trim();
      headings.push({ id: slugify(text), text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      headings.push({ id: slugify(text), text, level: 3 });
    }
  }

  return headings;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.(mdx?|md)$/, ""));
}

export function getPostBySlug(slug: string): PostWithContent | null {
  const extensions = [".mdx", ".md"];
  let filePath: string | null = null;

  for (const ext of extensions) {
    const p = path.join(POSTS_DIR, `${slug}${ext}`);
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const fm = data as PostFrontmatter;

  return {
    slug,
    title: fm.title ?? slug,
    excerpt: fm.excerpt ?? "",
    date: fm.date ?? new Date().toISOString().split("T")[0],
    readTime: fm.readTime ?? "5 min read",
    category: fm.category ?? "Guide",
    author: fm.author ?? { name: "Adsentify Team", role: "Editorial", avatar: "AS" },
    keywords: fm.keywords,
    coverImage: fm.coverImage,
    featured: fm.featured ?? false,
    content,
    headings: extractHeadings(content),
  };
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const slugs = getPostSlugs();

  const posts = slugs
    .map((slug) => {
      const post = getPostBySlug(slug);
      if (!post) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, headings, ...meta } = post;
      return meta;
    })
    .filter((p): p is PostMeta => p !== null);

  // Sort newest first
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getRelatedPosts(
  currentSlug: string,
  category: string,
  limit = 3
): Promise<PostMeta[]> {
  const all = await getAllPosts();
  return all
    .filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit);
}
