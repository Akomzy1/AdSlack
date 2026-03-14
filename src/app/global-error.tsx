"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error must include <html> and <body>
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07080d] font-sans antialiased flex items-center justify-center px-6 text-center">
        <div>
          <div className="mb-6 text-6xl">💥</div>
          <h1 className="mb-3 text-2xl font-bold text-white">
            Critical error
          </h1>
          <p className="mb-6 max-w-md text-gray-400">
            A critical error occurred. We&apos;ve been notified.
          </p>
          {error.digest && (
            <p className="mb-6 font-mono text-xs text-gray-600">
              {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
