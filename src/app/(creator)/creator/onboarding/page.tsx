"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "YouTube Shorts"];

const NICHES = [
  "Beauty",
  "Skincare",
  "Fitness",
  "Health",
  "Kitchen",
  "Home Decor",
  "Fashion",
  "Lifestyle",
  "Tech",
  "Pets",
  "Food",
  "Travel",
];

const CONTENT_STYLES = [
  "UGC Review",
  "Unboxing",
  "Tutorial",
  "GRWM",
  "Storytime",
  "Day-in-Life",
  "Product Demo",
  "Comparison",
  "Comedy Skit",
  "Educational",
  "Before/After",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "India",
  "Philippines",
  "Other",
];

const TURNAROUND_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 4, label: "4 days" },
  { value: 5, label: "5 days" },
  { value: 7, label: "7 days" },
  { value: 10, label: "10 days" },
  { value: 14, label: "14 days" },
];

interface FormData {
  displayName: string;
  bio: string;
  profileImageUrl: string;
  country: string;
  language: string;
  platforms: string[];
  niches: string[];
  contentStyles: string[];
  priceMin: string;
  priceMax: string;
  turnaroundDays: number;
  portfolioUrls: string[];
  isAvailable: boolean;
}

const defaultForm: FormData = {
  displayName: "",
  bio: "",
  profileImageUrl: "",
  country: "",
  language: "English",
  platforms: [],
  niches: [],
  contentStyles: [],
  priceMin: "",
  priceMax: "",
  turnaroundDays: 5,
  portfolioUrls: [""],
  isAvailable: true,
};

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export default function CreatorOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePortfolioChange(index: number, value: string) {
    const updated = [...form.portfolioUrls];
    updated[index] = value;
    setForm((prev) => ({ ...prev, portfolioUrls: updated }));
  }

  function addPortfolioUrl() {
    if (form.portfolioUrls.length < 5) {
      setForm((prev) => ({ ...prev, portfolioUrls: [...prev.portfolioUrls, ""] }));
    }
  }

  function removePortfolioUrl(index: number) {
    setForm((prev) => ({
      ...prev,
      portfolioUrls: prev.portfolioUrls.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        priceMin: parseInt(form.priceMin) || 0,
        priceMax: parseInt(form.priceMax) || 0,
        portfolioUrls: form.portfolioUrls.filter(Boolean),
      };
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save profile");
        setSaving(false);
        return;
      }
      router.push("/creator/briefs");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: "#0c0e18",
    borderColor: "#1a1d2e",
    color: "#e5e7eb",
  };

  const focusClass =
    "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500";

  const CheckChip = ({
    label,
    checked,
    onClick,
  }: {
    label: string;
    checked: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        backgroundColor: checked ? "#06b6d4" + "22" : "#0c0e18",
        borderColor: checked ? "#06b6d4" : "#1a1d2e",
        color: checked ? "#06b6d4" : "#9ca3af",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ backgroundColor: "#06070c" }}
    >
      <div className="w-full max-w-xl">
        {/* Logo + Step indicator */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold" style={{ color: "#f97316" }}>
            AdSlack
          </span>
          <span
            className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: "#06b6d4" + "22", color: "#06b6d4" }}
          >
            Creator
          </span>
          <p className="mt-3 text-sm" style={{ color: "#6b7280" }}>
            Set up your creator profile — step {step} of 3
          </p>
          {/* Progress bar */}
          <div
            className="mt-4 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "#1a1d2e" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / 3) * 100}%`,
                backgroundColor: "#06b6d4",
              }}
            />
          </div>
        </div>

        <div
          className="rounded-2xl border p-8"
          style={{
            background: "linear-gradient(145deg, #0f1019, #12141f)",
            borderColor: "#1a1d2e",
          }}
        >
          {error && (
            <div className="mb-5 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white">About You</h2>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  placeholder="e.g. Sarah Chen"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Bio{" "}
                  <span className="text-gray-600">
                    ({form.bio.length}/500)
                  </span>
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell brands about yourself, your style, and what makes your content unique…"
                  className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Profile Image URL
                </label>
                <input
                  name="profileImageUrl"
                  value={form.profileImageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Country
                  </label>
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Language
                  </label>
                  <input
                    name="language"
                    value={form.language}
                    onChange={handleChange}
                    placeholder="English"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!form.displayName.trim()) {
                    setError("Display name is required");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#06b6d4" }}
              >
                Next: Niche & Platforms →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">
                Niche & Platforms
              </h2>

              <div>
                <label className="mb-3 block text-xs font-medium text-gray-400">
                  Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <CheckChip
                      key={p}
                      label={p}
                      checked={form.platforms.includes(p)}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          platforms: toggle(prev.platforms, p),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-medium text-gray-400">
                  Niches
                </label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <CheckChip
                      key={n}
                      label={n}
                      checked={form.niches.includes(n)}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          niches: toggle(prev.niches, n),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-medium text-gray-400">
                  Content Styles
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_STYLES.map((s) => (
                    <CheckChip
                      key={s}
                      label={s}
                      checked={form.contentStyles.includes(s)}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          contentStyles: toggle(prev.contentStyles, s),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-white/5"
                  style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                  className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#06b6d4" }}
                >
                  Next: Pricing & Portfolio →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">
                Pricing & Portfolio
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Min Price (USD)
                  </label>
                  <input
                    name="priceMin"
                    type="number"
                    value={form.priceMin}
                    onChange={handleChange}
                    placeholder="50"
                    min={0}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Max Price (USD)
                  </label>
                  <input
                    name="priceMax"
                    type="number"
                    value={form.priceMax}
                    onChange={handleChange}
                    placeholder="150"
                    min={0}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Turnaround Time
                </label>
                <select
                  name="turnaroundDays"
                  value={form.turnaroundDays}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      turnaroundDays: parseInt(e.target.value),
                    }))
                  }
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                  style={inputStyle}
                >
                  {TURNAROUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Portfolio URLs (up to 5)
                </label>
                <div className="space-y-2">
                  {form.portfolioUrls.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={url}
                        onChange={(e) =>
                          handlePortfolioChange(i, e.target.value)
                        }
                        placeholder={`https://...`}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm ${focusClass}`}
                        style={inputStyle}
                      />
                      {form.portfolioUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePortfolioUrl(i)}
                          className="rounded-xl border px-3 text-xs transition-colors hover:bg-red-950/30 hover:border-red-800"
                          style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {form.portfolioUrls.length < 5 && (
                    <button
                      type="button"
                      onClick={addPortfolioUrl}
                      className="text-xs transition-colors hover:text-cyan-400"
                      style={{ color: "#06b6d4" }}
                    >
                      + Add another URL
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: "#1a1d2e" }}>
                <div>
                  <p className="text-sm font-medium text-white">
                    Available for briefs
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    Brands can send you briefs when on
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      isAvailable: !prev.isAvailable,
                    }))
                  }
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                  style={{
                    backgroundColor: form.isAvailable ? "#22c55e" : "#374151",
                  }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform"
                    style={{
                      transform: form.isAvailable
                        ? "translateX(20px)"
                        : "translateX(0)",
                    }}
                  />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-white/5"
                  style={{ borderColor: "#1a1d2e", color: "#9ca3af" }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: "#06b6d4" }}
                >
                  {saving ? "Saving…" : "Complete Setup →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
