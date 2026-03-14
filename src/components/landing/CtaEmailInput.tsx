"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CtaEmailInput() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // Pass email to sign-in page as hint
    router.push(`/api/auth/signin?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        type="submit"
        className="rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] transition-all hover:shadow-[0_0_32px_rgba(249,115,22,0.5)] active:scale-95 whitespace-nowrap"
      >
        Get Started Free →
      </button>
    </form>
  );
}
