"use client";

/**
 * BookmarkButton
 *
 * A self-contained bookmark icon + folder-picker dropdown.
 * Reads from / writes to the SavedContext so every instance stays in sync.
 *
 * Not saved  → click → folder dropdown (pick folder or "All Saved")
 * Saved      → click → mini dropdown showing saved location + Remove option
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSaved } from "@/contexts/SavedContext";

interface BookmarkButtonProps {
  adId: string;
  /** Extra classes applied to the outermost container */
  className?: string;
}

export function BookmarkButton({ adId, className = "" }: BookmarkButtonProps) {
  const { isSaved, getSavedEntry, folders, save, unsave, createFolder } = useSaved();

  const [open, setOpen]                     = useState(false);
  const [confirmRemove, setConfirmRemove]   = useState(false);
  const [showNewFolder, setShowNewFolder]   = useState(false);
  const [newFolderName, setNewFolderName]   = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError]       = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const saved      = isSaved(adId);
  const savedEntry = getSavedEntry(adId);
  const savedFolder = savedEntry?.folderId
    ? folders.find((f) => f.id === savedEntry.folderId)
    : null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirmRemove(false);
        setShowNewFolder(false);
        setNewFolderName("");
        setFolderError(null);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Auto-focus new folder input
  useEffect(() => {
    if (showNewFolder) inputRef.current?.focus();
  }, [showNewFolder]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => !v);
    setConfirmRemove(false);
    setShowNewFolder(false);
    setNewFolderName("");
    setFolderError(null);
  }, []);

  const handleSaveTo = useCallback(
    (e: React.MouseEvent, folderId: string | null) => {
      e.stopPropagation();
      void save(adId, folderId);
      setOpen(false);
    },
    [adId, save]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirmRemove) {
        setConfirmRemove(true);
        return;
      }
      void unsave(adId);
      setOpen(false);
      setConfirmRemove(false);
    },
    [adId, unsave, confirmRemove]
  );

  const handleCreateFolder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const name = newFolderName.trim();
      if (!name) return;

      setCreatingFolder(true);
      setFolderError(null);
      try {
        const folder = await createFolder(name);
        await save(adId, folder.id);
        setOpen(false);
        setShowNewFolder(false);
        setNewFolderName("");
      } catch (err) {
        setFolderError(err instanceof Error ? err.message : "Failed to create folder");
      } finally {
        setCreatingFolder(false);
      }
    },
    [adId, newFolderName, createFolder, save]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger button ───────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        title={saved ? "Saved" : "Save ad"}
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150",
          saved
            ? "bg-accent text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]"
            : "bg-black/50 text-white/70 backdrop-blur-sm hover:bg-black/70 hover:text-white",
        ].join(" ")}
      >
        <BookmarkIcon filled={saved} />
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-border bg-surface-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {saved ? (
            // ── Saved state dropdown ──────────────────────────────────────
            <>
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Saved in
                </p>
                <p className="text-xs font-medium text-foreground mt-0.5 truncate">
                  {savedFolder?.name ?? "All Saved"}
                </p>
              </div>

              {/* Move to other folder */}
              {folders.length > 0 && (
                <div className="py-1 border-b border-border/60">
                  <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
                    Move to
                  </p>
                  {folders
                    .filter((f) => f.id !== savedEntry?.folderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={(e) => handleSaveTo(e, f.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground-2 hover:bg-surface-3 transition-colors"
                      >
                        <span className="text-muted">📁</span> {f.name}
                      </button>
                    ))
                  }
                  {savedEntry?.folderId && (
                    <button
                      onClick={(e) => handleSaveTo(e, null)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground-2 hover:bg-surface-3 transition-colors"
                    >
                      <span className="text-muted">🔖</span> All Saved (no folder)
                    </button>
                  )}
                </div>
              )}

              {/* Remove */}
              <div className="py-1">
                <button
                  onClick={handleRemove}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    confirmRemove
                      ? "bg-danger/10 text-danger hover:bg-danger/20"
                      : "text-danger/70 hover:bg-surface-3 hover:text-danger",
                  ].join(" ")}
                >
                  <span>{confirmRemove ? "✕" : "🗑"}</span>
                  {confirmRemove ? "Confirm remove" : "Remove from saved"}
                </button>
              </div>
            </>
          ) : (
            // ── Not saved dropdown ──────────────────────────────────────
            <>
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Save to folder
                </p>
              </div>

              <div className="py-1 max-h-48 overflow-y-auto">
                {/* All Saved (no folder) */}
                <button
                  onClick={(e) => handleSaveTo(e, null)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground-2 hover:bg-surface-3 transition-colors"
                >
                  <span>🔖</span> All Saved
                </button>

                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={(e) => handleSaveTo(e, f.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground-2 hover:bg-surface-3 transition-colors"
                  >
                    <span className="text-muted">📁</span>
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto text-[10px] text-muted font-mono">{f.adCount}</span>
                  </button>
                ))}
              </div>

              {/* New folder form */}
              <div className="border-t border-border/60 pt-1 pb-1">
                {showNewFolder ? (
                  <form onSubmit={handleCreateFolder} className="px-2 py-1">
                    <input
                      ref={inputRef}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Folder name..."
                      maxLength={80}
                      className="input h-7 text-xs px-2"
                      disabled={creatingFolder}
                    />
                    {folderError && (
                      <p className="text-[10px] text-danger mt-1 px-1">{folderError}</p>
                    )}
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="submit"
                        disabled={creatingFolder || !newFolderName.trim()}
                        className="flex-1 rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                      >
                        {creatingFolder ? "Creating..." : "Create & Save"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowNewFolder(false); }}
                        className="rounded-md border border-border px-2 py-1 text-[10px] text-muted hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowNewFolder(true); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
                  >
                    <span className="text-accent font-bold">+</span> New folder
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bookmark SVG icon ────────────────────────────────────────────────────────

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13"
      height="15"
      viewBox="0 0 13 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {filled ? (
        <path
          d="M1 1.5C1 1.22386 1.22386 1 1.5 1H11.5C11.7761 1 12 1.22386 12 1.5V14L6.5 10.5L1 14V1.5Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M1 1.5C1 1.22386 1.22386 1 1.5 1H11.5C11.7761 1 12 1.22386 12 1.5V14L6.5 10.5L1 14V1.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
