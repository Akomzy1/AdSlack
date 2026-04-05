"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function SelectRolePage() {
  const { update } = useSession();
  const [loading, setLoading] = useState<"ADVERTISER" | "CREATOR" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectRole(role: "ADVERTISER" | "CREATOR") {
    setLoading(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        setLoading(null);
        return;
      }
      // Refresh the JWT so the proxy sees the new userRole before redirecting
      await update();
      window.location.href = role === "ADVERTISER" ? "/discover" : "/creator/onboarding";
    } catch {
      setError("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#06070c" }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-2xl font-bold" style={{ color: "#f97316" }}>
          Adsentify
        </span>
        <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
          Welcome! Tell us how you&apos;ll be using Adsentify.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="flex w-full max-w-3xl flex-col gap-5 sm:flex-row">
        {/* Advertiser Card */}
        <button
          onClick={() => selectRole("ADVERTISER")}
          disabled={loading !== null}
          className="flex flex-1 flex-col items-center gap-5 rounded-2xl border p-8 text-left transition-all hover:border-orange-500/50 hover:bg-orange-500/5 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: "#f97316" + "22" }}
          >
            🛍️
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              I&apos;m an Ecommerce Brand
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
              Discover winning ads, spy on competitors, and send creative briefs
              to UGC creators.
            </p>
          </div>
          <div
            className="mt-auto w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors"
            style={{
              backgroundColor: loading === "ADVERTISER" ? "#ea6e0e" : "#f97316",
              color: "#fff",
            }}
          >
            {loading === "ADVERTISER" ? "Setting up…" : "Continue as Brand →"}
          </div>
        </button>

        {/* Creator Card */}
        <button
          onClick={() => selectRole("CREATOR")}
          disabled={loading !== null}
          className="flex flex-1 flex-col items-center gap-5 rounded-2xl border p-8 text-left transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: "#06b6d4" + "22" }}
          >
            🎬
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              I&apos;m a UGC Creator
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
              Get discovered by brands, receive creative briefs, and grow your
              UGC business.
            </p>
          </div>
          <div
            className="mt-auto w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors"
            style={{
              backgroundColor: loading === "CREATOR" ? "#0891b2" : "#06b6d4",
              color: "#fff",
            }}
          >
            {loading === "CREATOR" ? "Setting up…" : "Continue as Creator →"}
          </div>
        </button>
      </div>

      <p className="mt-8 text-xs" style={{ color: "#374151" }}>
        You can change your role later in settings.
      </p>
    </div>
  );
}
