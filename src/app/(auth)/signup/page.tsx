import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Start discovering winning ads with Adslack — free forever.",
};

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-black text-lg text-background select-none">
            A
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Start for free
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover winning ads in seconds. No credit card required.
            </p>
          </div>
        </div>

        {/* Social proof micro-copy */}
        <div className="mb-4 flex items-center justify-center gap-4 rounded-lg border border-border bg-surface/50 px-4 py-3">
          <div className="flex -space-x-2">
            {["A", "B", "C"].map((l) => (
              <div
                key={l}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-surface-3 text-xs font-bold text-muted-foreground"
              >
                {l}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Join <span className="font-semibold text-foreground">2,400+</span> marketers already using Adslack
          </p>
        </div>

        <div className="card p-6">
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
