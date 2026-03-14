"use client";

import { useState, useCallback, useRef } from "react";
import { AlertFrequency } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const NICHES = [
  "E-Commerce", "SaaS", "Health & Wellness", "Finance", "Beauty & Skincare",
  "Fitness", "Food & Beverage", "Fashion", "Education", "Real Estate",
  "Travel", "Gaming", "Pet Care", "Home & Garden", "Baby & Kids",
  "Supplements", "Insurance", "Legal", "Automotive", "B2B",
];

const PLATFORMS = ["TIKTOK", "FACEBOOK", "INSTAGRAM", "YOUTUBE"] as const;
const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: "TikTok", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", YOUTUBE: "YouTube",
};
const PLATFORM_COLORS: Record<string, string> = {
  TIKTOK: "text-[#ff0050] bg-[#ff005015] border-[#ff005030]",
  FACEBOOK: "text-[#1877f2] bg-[#1877f215] border-[#1877f230]",
  INSTAGRAM: "text-[#e1306c] bg-[#e1306c15] border-[#e1306c30]",
  YOUTUBE: "text-[#ff0000] bg-[#ff000015] border-[#ff000030]",
};

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  INSTANT: "⚡ Instant",
  DAILY_DIGEST: "📅 Daily Digest",
  WEEKLY_DIGEST: "📆 Weekly Digest",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  name: string;
  niches: string[];
  platforms: string[];
  velocityThreshold: number;
  keywords: string | null;
  frequency: AlertFrequency;
  isActive: boolean;
  notificationCount: number;
  lastCheckedAt: string | null;
  createdAt: string;
}

interface AlertsViewProps {
  initialRules: AlertRule[];
  userRole: string;
  limit: number;
}

// ── Default form state ────────────────────────────────────────────────────────

interface FormState {
  name: string;
  niches: string[];
  platforms: string[];
  velocityThreshold: number;
  keywords: string;
  frequency: AlertFrequency;
}

const DEFAULT_FORM: FormState = {
  name: "",
  niches: [],
  platforms: [],
  velocityThreshold: 90,
  keywords: "",
  frequency: AlertFrequency.INSTANT,
};

// ── Main component ────────────────────────────────────────────────────────────

export function AlertsView({ initialRules, userRole, limit }: AlertsViewProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const atLimit = limit > 0 && rules.length >= limit;
  const noAccess = limit === 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      niches: rule.niches,
      platforms: rule.platforms,
      velocityThreshold: rule.velocityThreshold,
      keywords: rule.keywords ?? "",
      frequency: rule.frequency,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Rule name is required"); return; }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        niches: form.niches,
        platforms: form.platforms,
        velocityThreshold: form.velocityThreshold,
        keywords: form.keywords.trim() || undefined,
        frequency: form.frequency,
      };

      if (editingId) {
        const res = await fetch(`/api/alerts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Update failed");
        }
        const { rule } = await res.json() as { rule: AlertRule };
        setRules((prev) => prev.map((r) => r.id === editingId
          ? { ...r, ...rule, notificationCount: r.notificationCount }
          : r
        ));
        showToast("Alert rule updated");
      } else {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Create failed");
        }
        const { rule } = await res.json() as { rule: AlertRule };
        setRules((prev) => [rule, ...prev]);
        showToast("Alert rule created");
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: AlertRule) {
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    try {
      const res = await fetch(`/api/alerts/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error("Toggle failed");
    } catch {
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: rule.isActive } : r));
      showToast("Failed to update rule");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast("Alert rule deleted");
    } catch {
      showToast("Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Velocity Alerts</h1>
          <p className="mt-1 text-sm text-muted">
            Get notified when ads hit your velocity threshold.
          </p>
        </div>
        {!noAccess && (
          <button
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? `Limit reached (${limit} rules on ${userRole} plan)` : undefined}
            className="btn-secondary flex shrink-0 items-center gap-2 text-sm disabled:opacity-50"
          >
            <span className="text-accent font-bold text-base">+</span> New Rule
          </button>
        )}
      </div>

      {/* Upgrade banner for FREE users */}
      {noAccess && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 px-5 py-4 flex items-center gap-4">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-semibold text-foreground">Alerts require PRO or higher</p>
            <p className="text-sm text-muted mt-0.5">Upgrade to get notified when trending ads match your niche.</p>
          </div>
          <a href="/billing" className="ml-auto shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
            Upgrade
          </a>
        </div>
      )}

      {/* At-limit banner */}
      {atLimit && (
        <div className="mb-6 rounded-xl border border-border bg-surface-2 px-5 py-3 text-sm text-muted">
          You&apos;ve reached the {limit}-rule limit on your {userRole} plan.{" "}
          <a href="/billing" className="text-accent hover:underline">Upgrade</a> for more.
        </div>
      )}

      {/* Rule list */}
      {rules.length === 0 && !noAccess ? (
        <EmptyState onCreateClick={openCreate} />
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => handleToggle(rule)}
              onEdit={() => openEdit(rule)}
              onDelete={() => handleDelete(rule.id)}
              deleting={deletingId === rule.id}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? "Edit Alert Rule" : "New Alert Rule"}
              </h2>
              <button onClick={closeForm} className="text-muted hover:text-foreground text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Rule Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TikTok Fitness Alerts"
                  maxLength={80}
                  className="input w-full"
                  disabled={saving}
                />
              </div>

              {/* Niches */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Niches <span className="text-muted font-normal normal-case">(leave empty for all)</span>
                </label>
                <MultiSelect
                  options={NICHES}
                  selected={form.niches}
                  onChange={(niches) => setForm((f) => ({ ...f, niches }))}
                  placeholder="Select niches..."
                  disabled={saving}
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Platforms <span className="text-muted font-normal normal-case">(leave empty for all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const selected = form.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={saving}
                        onClick={() => setForm((f) => ({
                          ...f,
                          platforms: selected
                            ? f.platforms.filter((x) => x !== p)
                            : [...f.platforms, p],
                        }))}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                          selected ? PLATFORM_COLORS[p] : "border-border text-muted hover:border-border-hover hover:text-foreground-2",
                        ].join(" ")}
                      >
                        {PLATFORM_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Velocity threshold */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Velocity Threshold: <span className="text-accent">{form.velocityThreshold}</span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={form.velocityThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, velocityThreshold: Number(e.target.value) }))}
                  className="w-full accent-accent"
                  disabled={saving}
                />
                <div className="flex justify-between text-[10px] text-muted mt-0.5">
                  <span>50 — Rising</span>
                  <span>75 — High</span>
                  <span>90 — 🔥 Explosive</span>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Keywords <span className="text-muted font-normal normal-case">(optional — matched against hook text &amp; product name)</span>
                </label>
                <input
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  placeholder="e.g. weight loss protein supplement"
                  maxLength={200}
                  className="input w-full"
                  disabled={saving}
                />
                <p className="mt-1 text-[10px] text-muted">Space-separated — all keywords must match</p>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Notification Frequency
                </label>
                <div className="flex gap-2">
                  {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      disabled={saving}
                      onClick={() => setForm((f) => ({ ...f, frequency: val as AlertFrequency }))}
                      className={[
                        "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                        form.frequency === val
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted hover:border-border-hover hover:text-foreground-2",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Rule"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-surface-2 border border-border px-5 py-2.5 text-sm font-medium text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Rule card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  deleting,
}: {
  rule: AlertRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={[
      "rounded-xl border bg-surface transition-all duration-200",
      rule.isActive ? "border-border" : "border-border/50 opacity-60",
    ].join(" ")}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-foreground">{rule.name}</p>
              {rule.isActive && (
                <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success border border-success/20">
                  ACTIVE
                </span>
              )}
            </div>

            {/* Tags row */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                Score ≥ {rule.velocityThreshold}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                {FREQUENCY_LABELS[rule.frequency]}
              </span>
              {rule.niches.length > 0
                ? rule.niches.slice(0, 3).map((n) => (
                    <span key={n} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                      {n}
                    </span>
                  ))
                : <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted">All niches</span>
              }
              {rule.niches.length > 3 && (
                <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                  +{rule.niches.length - 3} more
                </span>
              )}
              {rule.platforms.length > 0
                ? rule.platforms.map((p) => (
                    <span key={p} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PLATFORM_COLORS[p]}`}>
                      {PLATFORM_LABELS[p]}
                    </span>
                  ))
                : <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted">All platforms</span>
              }
              {rule.keywords && (
                <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted font-mono">
                  &ldquo;{rule.keywords.slice(0, 30)}{rule.keywords.length > 30 ? "…" : ""}&rdquo;
                </span>
              )}
            </div>

            {/* Footer stats */}
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
              <span>{rule.notificationCount} notification{rule.notificationCount !== 1 ? "s" : ""}</span>
              {rule.lastCheckedAt && (
                <>
                  <span>·</span>
                  <span>Last checked {formatRelative(rule.lastCheckedAt)}</span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Toggle */}
            <button
              onClick={onToggle}
              title={rule.isActive ? "Pause rule" : "Activate rule"}
              className={[
                "relative h-5 w-9 rounded-full border transition-colors",
                rule.isActive ? "bg-accent border-accent" : "bg-surface-3 border-border",
              ].join(" ")}
            >
              <span className={[
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                rule.isActive ? "translate-x-4" : "translate-x-0.5",
              ].join(" ")} />
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
              title="Edit rule"
            >
              <PencilIcon />
            </button>

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(); }}
                  disabled={deleting}
                  className="rounded-lg bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger hover:bg-danger/20"
                >
                  {deleting ? "…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 text-[10px] text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                title="Delete rule"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  disabled,
}: {
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((x) => x !== option)
        : [...selected, option]
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="input w-full flex items-center justify-between text-left"
      >
        <span className={selected.length === 0 ? "text-muted" : "text-foreground text-sm"}>
          {selected.length === 0
            ? placeholder
            : `${selected.length} selected: ${selected.slice(0, 3).join(", ")}${selected.length > 3 ? "…" : ""}`}
        </span>
        <span className="text-muted ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border border-border bg-surface-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground-2 hover:bg-surface-3 transition-colors"
            >
              <span className={[
                "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                selected.includes(opt) ? "bg-accent border-accent" : "border-border",
              ].join(" ")}>
                {selected.includes(opt) && <span className="text-white text-[8px]">✓</span>}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 border border-border">
        <span className="text-4xl">🔔</span>
      </div>
      <p className="text-lg font-semibold text-foreground">No alert rules yet</p>
      <p className="text-sm text-muted max-w-xs">
        Create a rule to get notified when ads matching your niche hit high velocity scores.
      </p>
      <button onClick={onCreateClick} className="mt-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
        Create your first rule
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M6 7v4M8 7v4M3 4l.8 7.2a1 1 0 0 0 .99.8h4.42a1 1 0 0 0 .99-.8L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
