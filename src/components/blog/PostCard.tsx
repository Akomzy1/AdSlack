import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

interface PostCardProps {
  post: PostMeta;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-accent/40 hover:bg-surface-2 ${featured ? "md:flex-row" : ""}`}
    >
      {/* Cover image placeholder */}
      <div
        className={`shrink-0 bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center ${
          featured ? "md:h-auto md:w-64" : "h-44"
        }`}
      >
        <span className="text-4xl opacity-30">
          {post.category === "Guide"
            ? "📖"
            : post.category === "Comparison"
            ? "⚖️"
            : post.category === "Strategy"
            ? "🎯"
            : post.category === "Science"
            ? "🔬"
            : "📝"}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="badge-accent">{post.category}</span>
          <span className="text-xs text-muted">{post.readTime}</span>
        </div>

        <h3
          className={`mb-2 font-bold leading-snug text-foreground transition-colors group-hover:text-accent ${
            featured ? "text-xl" : "text-base"
          }`}
        >
          {post.title}
        </h3>

        <p className="mb-4 flex-1 text-sm text-muted leading-relaxed line-clamp-2">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[9px] font-bold text-accent">
              {post.author.avatar}
            </div>
            <span>{post.author.name}</span>
          </div>
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
      </div>
    </Link>
  );
}
