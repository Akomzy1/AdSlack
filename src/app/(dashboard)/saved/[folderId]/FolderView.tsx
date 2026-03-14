"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AdWithMetrics } from "@/types/ads";
import { AdCard } from "@/components/ads/AdCard";
import { useSaved } from "@/contexts/SavedContext";

interface FolderViewProps {
  folderId: string;
  folderName: string;
  ads: AdWithMetrics[];
  userRole: string;
}

export function FolderView({ folderId, folderName, ads, userRole }: FolderViewProps) {
  const router = useRouter();
  const { folders, createFolder } = useSaved();

  const isAllSaved = folderId === "all";
  const isScale = userRole === "SCALE" || userRole === "ADMIN";

  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folderName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming_, setRenaming_] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [exportLoading, setExportLoading] = useState<"csv" | "brief" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = renameName.trim();
    if (!name || name === folderName) { setRenaming(false); return; }
    setRenaming_(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Rename failed");
      }
      setRenaming(false);
      router.refresh();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setRenaming_(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/saved");
      router.refresh();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
      showToast("Failed to delete folder");
    }
  }

  async function handleExport(format: "csv" | "brief") {
    if (!isScale) { showToast("Export requires the SCALE plan"); return; }
    setExportLoading(format);
    try {
      const res = await fetch(`/api/folders/${folderId}/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "csv"
        ? `${folderName.replace(/\s+/g, "_")}.csv`
        : `${folderName.replace(/\s+/g, "_")}_briefs.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Export failed");
    } finally {
      setExportLoading(null);
    }
  }

  function handleAdClick(ad: AdWithMetrics) {
    router.push(`/ads/${ad.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/saved"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          ← Saved Ads
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  maxLength={80}
                  autoFocus
                  className="input h-9 text-xl font-bold px-2"
                  disabled={renaming_}
                />
                <button
                  type="submit"
                  disabled={renaming_ || !renameName.trim()}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {renaming_ ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setRenaming(false); setRenameName(folderName); setRenameError(null); }}
                  className="text-muted hover:text-foreground text-xs"
                >
                  Cancel
                </button>
                {renameError && <p className="text-xs text-danger">{renameError}</p>}
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-foreground">
                  {isAllSaved ? "All Saved" : folderName}
                </h1>
                {!isAllSaved && (
                  <button
                    onClick={() => setRenaming(true)}
                    className="text-muted hover:text-foreground transition-colors"
                    title="Rename folder"
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}
            <p className="mt-1 text-sm text-muted">
              {ads.length} ad{ads.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Export buttons (SCALE+) */}
            <button
              onClick={() => handleExport("csv")}
              disabled={exportLoading === "csv"}
              title={isScale ? "Export as CSV" : "Export requires SCALE plan"}
              className={[
                "btn-secondary text-xs flex items-center gap-1.5",
                !isScale ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {exportLoading === "csv" ? "Exporting…" : "↓ CSV"}
            </button>
            <button
              onClick={() => handleExport("brief")}
              disabled={exportLoading === "brief"}
              title={isScale ? "Export Creative Brief Pack" : "Export requires SCALE plan"}
              className={[
                "btn-secondary text-xs flex items-center gap-1.5",
                !isScale ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {exportLoading === "brief" ? "Exporting…" : "↓ Brief Pack"}
            </button>

            {/* Delete folder */}
            {!isAllSaved && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary text-xs text-danger/80 hover:text-danger"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ad grid */}
      {ads.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} onClick={handleAdClick} />
          ))}
        </div>
      ) : (
        <div className="mt-24 flex flex-col items-center gap-4 text-center">
          <span className="text-6xl opacity-20">📁</span>
          <p className="text-lg font-semibold text-foreground">This folder is empty</p>
          <p className="text-sm text-muted max-w-xs">
            Save ads to this folder using the bookmark icon on any ad card.
          </p>
          <Link href="/discover" className="btn-secondary text-sm mt-2">
            Browse ads
          </Link>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">Delete folder?</h2>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">&ldquo;{folderName}&rdquo;</strong> will be
              deleted. All {ads.length} saved ads in it will move to{" "}
              <strong className="text-foreground">All Saved</strong>.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete folder"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
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

// ── Pencil icon ───────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
