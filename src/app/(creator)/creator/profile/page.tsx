"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "YouTube Shorts"];
const NICHES = [
  "Beauty","Skincare","Fitness","Health","Kitchen","Home Decor",
  "Fashion","Lifestyle","Tech","Pets","Food","Travel",
];
const CONTENT_STYLES = [
  "UGC Review","Unboxing","Tutorial","GRWM","Storytime","Day-in-Life",
  "Product Demo","Comparison","Comedy Skit","Educational","Before/After",
];
const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France",
  "Netherlands","Spain","Italy","Brazil","Mexico","India","Philippines","Other",
];
const TURNAROUND_OPTIONS = [1,2,3,4,5,7,10,14];

interface Profile {
  id: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  platforms: string[];
  niches: string[];
  contentStyles: string[];
  priceMin: number;
  priceMax: number;
  turnaroundDays: number;
  portfolioUrls: string[];
  country: string | null;
  language: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  completedBriefs: number;
}

const PLATFORM_ICONS: Record<string, string> = {
  TikTok: "🎵",
  Instagram: "📸",
  YouTube: "▶️",
  "YouTube Shorts": "📱",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="text-sm"
          style={{ color: s <= Math.round(rating) ? "#f59e0b" : "#374151" }}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm font-semibold text-white">
        {rating > 0 ? rating.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export default function CreatorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // form state
  const [form, setForm] = useState<Partial<Profile & { portfolioUrls: string[] }>>({});

  useEffect(() => {
    fetch("/api/creator/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile(data);
          setForm({ ...data, portfolioUrls: data.portfolioUrls?.length ? data.portfolioUrls : [""] });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggle(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        ...form,
        priceMin: Number(form.priceMin) || 0,
        priceMax: Number(form.priceMax) || 0,
        portfolioUrls: (form.portfolioUrls ?? []).filter(Boolean),
      };
      const res = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
      } else {
        const updated = await res.json();
        setProfile(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: "#0c0e18",
    borderColor: "#1a1d2e",
    color: "#e5e7eb",
  };
  const focusClass = "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500";

  const CheckChip = ({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        backgroundColor: checked ? "#06b6d422" : "#0c0e18",
        borderColor: checked ? "#06b6d4" : "#1a1d2e",
        color: checked ? "#06b6d4" : "#9ca3af",
      }}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
            {mode === "edit" ? "Edit how brands see you" : "Preview your public profile"}
          </p>
        </div>
        <button
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}
        >
          {mode === "edit" ? "Preview Profile →" : "← Edit Profile"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-400">
          Profile saved successfully.
        </div>
      )}

      {/* PREVIEW MODE */}
      {mode === "preview" && profile && (
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          {/* Profile header */}
          <div className="flex items-start gap-5">
            {profile.profileImageUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                <Image src={profile.profileImageUrl} alt={profile.displayName} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                style={{ backgroundColor: "#06b6d422" }}
              >
                {profile.displayName[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{profile.displayName}</h2>
                {profile.isVerified && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "#06b6d422", color: "#06b6d4" }}
                  >
                    ✓ Verified
                  </span>
                )}
                {profile.isAvailable ? (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#22c55e22", color: "#22c55e" }}>
                    Available
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#37414122", color: "#6b7280" }}>
                    Unavailable
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <StarRating rating={profile.rating} />
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  ({profile.reviewCount} reviews · {profile.completedBriefs} completed)
                </span>
              </div>
              {profile.country && (
                <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>
                  {profile.country} · {profile.language ?? "English"}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-white">
                ${profile.priceMin}–${profile.priceMax}
              </p>
              <p className="text-xs" style={{ color: "#6b7280" }}>per video</p>
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                {profile.turnaroundDays}d turnaround
              </p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-5 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
              {profile.bio}
            </p>
          )}

          {/* Platforms */}
          {profile.platforms.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium" style={{ color: "#6b7280" }}>Platforms</p>
              <div className="flex flex-wrap gap-2">
                {profile.platforms.map((p) => (
                  <span key={p} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}>
                    <span>{PLATFORM_ICONS[p] ?? "📱"}</span> {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Niches */}
          {profile.niches.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium" style={{ color: "#6b7280" }}>Niches</p>
              <div className="flex flex-wrap gap-2">
                {profile.niches.map((n) => (
                  <span key={n} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "#06b6d422", color: "#06b6d4" }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content Styles */}
          {profile.contentStyles.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium" style={{ color: "#6b7280" }}>Content Styles</p>
              <div className="flex flex-wrap gap-2">
                {profile.contentStyles.map((s) => (
                  <span key={s} className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "#1a1d2e", color: "#9ca3af" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {profile.portfolioUrls.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium" style={{ color: "#6b7280" }}>Portfolio</p>
              <div className="space-y-1">
                {profile.portfolioUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs underline hover:text-cyan-400 transition-colors truncate" style={{ color: "#06b6d4" }}>
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODE */}
      {mode === "edit" && (
        <div
          className="rounded-2xl border p-8 space-y-7"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          {/* Basic Info */}
          <section>
            <h3 className="mb-4 text-sm font-semibold text-white">Basic Info</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Display Name <span className="text-red-400">*</span></label>
                <input value={form.displayName ?? ""} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Bio ({(form.bio ?? "").length}/500)</label>
                <textarea value={form.bio ?? ""} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={500} rows={4} className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Profile Image URL</label>
                <input value={form.profileImageUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, profileImageUrl: e.target.value }))} placeholder="https://..." className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Country</label>
                  <select value={form.country ?? ""} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle}>
                    <option value="">Select…</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Language</label>
                  <input value={form.language ?? "English"} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
                </div>
              </div>
            </div>
          </section>

          {/* Platforms */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <CheckChip key={p} label={p} checked={(form.platforms ?? []).includes(p)} onClick={() => setForm((f) => ({ ...f, platforms: toggle(f.platforms ?? [], p) }))} />
              ))}
            </div>
          </section>

          {/* Niches */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Niches</h3>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <CheckChip key={n} label={n} checked={(form.niches ?? []).includes(n)} onClick={() => setForm((f) => ({ ...f, niches: toggle(f.niches ?? [], n) }))} />
              ))}
            </div>
          </section>

          {/* Content Styles */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Content Styles</h3>
            <div className="flex flex-wrap gap-2">
              {CONTENT_STYLES.map((s) => (
                <CheckChip key={s} label={s} checked={(form.contentStyles ?? []).includes(s)} onClick={() => setForm((f) => ({ ...f, contentStyles: toggle(f.contentStyles ?? [], s) }))} />
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h3 className="mb-4 text-sm font-semibold text-white">Pricing & Availability</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Min Price (USD)</label>
                <input type="number" value={form.priceMin ?? ""} onChange={(e) => setForm((f) => ({ ...f, priceMin: parseInt(e.target.value) || 0 }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Max Price (USD)</label>
                <input type="number" value={form.priceMax ?? ""} onChange={(e) => setForm((f) => ({ ...f, priceMax: parseInt(e.target.value) || 0 }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Turnaround Time</label>
              <select value={form.turnaroundDays ?? 5} onChange={(e) => setForm((f) => ({ ...f, turnaroundDays: parseInt(e.target.value) }))} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle}>
                {TURNAROUND_OPTIONS.map((d) => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}
              </select>
            </div>
          </section>

          {/* Portfolio */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Portfolio URLs</h3>
            <div className="space-y-2">
              {(form.portfolioUrls ?? [""]).map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input value={url} onChange={(e) => {
                    const updated = [...(form.portfolioUrls ?? [""])];
                    updated[i] = e.target.value;
                    setForm((f) => ({ ...f, portfolioUrls: updated }));
                  }} placeholder="https://..." className={`flex-1 rounded-xl border px-4 py-2.5 text-sm ${focusClass}`} style={inputStyle} />
                  {(form.portfolioUrls ?? []).length > 1 && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, portfolioUrls: (f.portfolioUrls ?? []).filter((_, idx) => idx !== i) }))} className="rounded-xl border px-3 text-xs transition-colors hover:bg-red-950/30" style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}>✕</button>
                  )}
                </div>
              ))}
              {(form.portfolioUrls ?? []).length < 5 && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, portfolioUrls: [...(f.portfolioUrls ?? []), ""] }))} className="text-xs hover:text-cyan-400 transition-colors" style={{ color: "#06b6d4" }}>
                  + Add URL
                </button>
              )}
            </div>
          </section>

          <button onClick={handleSave} disabled={saving} className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ backgroundColor: "#06b6d4" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
