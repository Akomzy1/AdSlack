import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// ── Callout boxes ─────────────────────────────────────────────────────────────

interface CalloutProps {
  type?: "info" | "tip" | "warning" | "pro";
  children: React.ReactNode;
}

export function Callout({ type = "info", children }: CalloutProps) {
  const styles: Record<string, { bg: string; border: string; icon: string }> = {
    info:    { bg: "bg-primary/5",  border: "border-primary/20",  icon: "ℹ️" },
    tip:     { bg: "bg-success/5",  border: "border-success/20",  icon: "💡" },
    warning: { bg: "bg-warning/5",  border: "border-warning/20",  icon: "⚠️" },
    pro:     { bg: "bg-accent/5",   border: "border-accent/20",   icon: "🔥" },
  };
  const s = styles[type] ?? styles.info;

  return (
    <div className={`my-6 flex gap-3 rounded-xl border ${s.border} ${s.bg} p-4`}>
      <span className="mt-0.5 shrink-0 text-base">{s.icon}</span>
      <div className="min-w-0 text-sm leading-relaxed text-foreground-2">{children}</div>
    </div>
  );
}

// ── Internal CTA ──────────────────────────────────────────────────────────────

interface CtaProps {
  title: string;
  href?: string;
  label?: string;
}

export function InlineCta({ title, href = "/api/auth/signin", label = "Try it free →" }: CtaProps) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 to-transparent p-6">
      <p className="mb-3 font-semibold text-foreground">{title}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-hover active:scale-95"
      >
        {label}
      </Link>
    </div>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

interface CompareRowProps {
  feature: string;
  adforge: string | boolean;
  competitor: string | boolean;
  competitorName?: string;
}

export function CompareRow({ feature, adforge, competitor, competitorName = "Competitor" }: CompareRowProps) {
  const renderCell = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <span className="text-green-400 font-bold">✓</span>
      ) : (
        <span className="text-muted/40">✕</span>
      );
    }
    return <span className="text-sm text-foreground-2">{val}</span>;
  };

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-4 text-sm text-foreground-2">{feature}</td>
      <td className="px-4 py-3 text-center">{renderCell(adforge)}</td>
      <td className="px-4 py-3 text-center text-muted">{renderCell(competitor)}</td>
    </tr>
  );
}

// ── Standard prose overrides ──────────────────────────────────────────────────

type HProps = ComponentPropsWithoutRef<"h2">;
type PProps = ComponentPropsWithoutRef<"p">;
type AProps = ComponentPropsWithoutRef<"a">;
type UlProps = ComponentPropsWithoutRef<"ul">;
type OlProps = ComponentPropsWithoutRef<"ol">;
type LiProps = ComponentPropsWithoutRef<"li">;
type BlockquoteProps = ComponentPropsWithoutRef<"blockquote">;
type CodeProps = ComponentPropsWithoutRef<"code">;
type PreProps = ComponentPropsWithoutRef<"pre">;
type HrProps = ComponentPropsWithoutRef<"hr">;

export const mdxComponents = {
  // Headings — rehype-slug adds the id automatically from the text
  h2: (props: HProps) => (
    <h2
      className="mt-10 mb-4 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground"
      {...props}
    />
  ),
  h3: (props: HProps) => (
    <h3
      className="mt-7 mb-3 scroll-mt-24 text-xl font-semibold text-foreground"
      {...props}
    />
  ),
  h4: (props: HProps) => (
    <h4
      className="mt-5 mb-2 scroll-mt-24 text-base font-semibold text-foreground"
      {...props}
    />
  ),
  p: (props: PProps) => (
    <p className="mb-4 leading-relaxed text-foreground-2" {...props} />
  ),
  a: ({ href, ...props }: AProps) => {
    const isExternal = href?.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent transition-colors"
          {...props}
        />
      );
    }
    return (
      <Link
        href={href ?? "#"}
        className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent transition-colors"
        {...props}
      />
    );
  },
  ul: (props: UlProps) => (
    <ul className="mb-4 list-disc pl-6 space-y-1.5 text-foreground-2" {...props} />
  ),
  ol: (props: OlProps) => (
    <ol className="mb-4 list-decimal pl-6 space-y-1.5 text-foreground-2" {...props} />
  ),
  li: (props: LiProps) => <li className="leading-relaxed" {...props} />,
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className="my-6 border-l-4 border-accent/60 pl-4 italic text-muted"
      {...props}
    />
  ),
  code: ({ children, ...props }: CodeProps) => (
    <code
      className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
      {...props}
    >
      {children}
    </code>
  ),
  pre: (props: PreProps) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-sm leading-relaxed"
      {...props}
    />
  ),
  hr: (props: HrProps) => (
    <hr className="my-8 border-border/60" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wider text-muted" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="px-4 py-3 text-left font-semibold" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-t border-border/40 px-4 py-3 text-foreground-2" {...props} />
  ),
  // Custom MDX components
  Callout,
  InlineCta,
  CompareRow,
};
