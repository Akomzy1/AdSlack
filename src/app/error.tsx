"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 text-5xl">⚠️</div>
      <h1 className="mb-3 text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mb-2 max-w-md text-muted-foreground">
        An unexpected error occurred. We&apos;ve been notified and are looking into it.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-muted">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors active:scale-95"
        >
          Try again
        </button>
        <Link
          href="/discover"
          className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-3 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
