"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSaved } from "@/contexts/SavedContext";

interface FolderSummary {
  id: string;
  name: string;
  adCount: number;
  thumbnails: string[];
  niches: string[];
  createdAt: string;
}

interface SavedViewProps {
  folders: FolderSummary[];
  allSavedCount: number;
}

export function SavedView({ folders: initialFolders, allSavedCount }: SavedViewProps) {
  const { folders: ctxFolders, createFolder } = useSaved();

  // Merge server-fetched niches/thumbnails with live context folder data
  const mergedFolders = ctxFolders.map((cf) => {
    const serverData = initialFolders.find((f) => f.id === cf.id);
    return {
      ...cf,
      thumbnails: serverData?.thumbnails ?? [],
      niches: serverData?.niches ?? [],
      createdAt: serverData?.createdAt ?? "",
    };
  });

  // Also include any newly created folders not in initialFolders
  const newFolders = ctxFolders
    .filter((cf) => !initialFolders.find((f) => f.id === cf.id))
    .map((cf) => ({ ...cf, thumbnails: [], niches: [], createdAt: "" }));

  const displayFolders = [...mergedFolders, ...newFolders];

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createFolder(name);
      setNewName("");
      setShowNewFolder(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Ads</h1>
          <p className="mt-1 text-sm text-muted">
            {allSavedCount} ad{allSavedCount !== 1 ? "s" : ""} saved across{" "}
            {displayFolders.length} folder{displayFolders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowNewFolder(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <span className="text-accent font-bold text-base">+</span> New Folder
        </button>
      </div>

      {/* New folder inline form */}
      {showNewFolder && (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-surface-2 px-4 py-3"
        >
          <span className="text-xl">📁</span>
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name..."
            maxLength={80}
            className="input flex-1 h-8 text-sm"
            disabled={creating}
          />
          {createError && (
            <p className="text-xs text-danger">{createError}</p>
          )}
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => { setShowNewFolder(false); setNewName(""); setCreateError(null); }}
            className="text-muted hover:text-foreground text-xs"
          >
            ✕
          </button>
        </form>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* All Saved virtual folder */}
        <Link
          href="/saved/all"
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
        >
          <FolderThumbnails thumbnails={[]} isAllSaved />
          <div className="p-4">
            <p className="font-semibold text-foreground">All Saved</p>
            <p className="mt-0.5 text-xs text-muted">
              {allSavedCount} ad{allSavedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </Link>

        {/* User folders */}
        {displayFolders.map((folder) => (
          <FolderCard key={folder.id} folder={folder} />
        ))}
      </div>

      {displayFolders.length === 0 && allSavedCount === 0 && (
        <div className="mt-24 flex flex-col items-center gap-4 text-center">
          <span className="text-6xl opacity-20">🔖</span>
          <p className="text-lg font-semibold text-foreground">No saved ads yet</p>
          <p className="text-sm text-muted max-w-xs">
            Click the bookmark icon on any ad to save it here for later reference.
          </p>
          <Link href="/discover" className="btn-secondary text-sm mt-2">
            Browse ads
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Folder card ───────────────────────────────────────────────────────────────

function FolderCard({
  folder,
}: {
  folder: FolderSummary & { thumbnails: string[]; niches: string[] };
}) {
  return (
    <Link
      href={`/saved/${folder.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    >
      <FolderThumbnails thumbnails={folder.thumbnails} />
      <div className="p-4">
        <p className="truncate font-semibold text-foreground">{folder.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {folder.adCount} ad{folder.adCount !== 1 ? "s" : ""}
        </p>
        {folder.niches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {folder.niches.slice(0, 3).map((n) => (
              <span
                key={n}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted border border-border"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Folder thumbnail mosaic ───────────────────────────────────────────────────

function FolderThumbnails({
  thumbnails,
  isAllSaved = false,
}: {
  thumbnails: string[];
  isAllSaved?: boolean;
}) {
  if (isAllSaved) {
    return (
      <div className="relative aspect-[4/3] w-full bg-surface-2 flex items-center justify-center">
        <span className="text-5xl opacity-20">🔖</span>
      </div>
    );
  }

  if (thumbnails.length === 0) {
    return (
      <div className="relative aspect-[4/3] w-full bg-surface-2 flex items-center justify-center">
        <span className="text-5xl opacity-20">📁</span>
      </div>
    );
  }

  if (thumbnails.length === 1 && thumbnails[0]) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-3">
        <Image src={thumbnails[0]} alt="" fill className="object-cover" sizes="300px" />
      </div>
    );
  }

  // 2–4 thumbnails: 2x2 mosaic
  const cells = thumbnails.slice(0, 4).filter((t): t is string => !!t);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-3 grid grid-cols-2 grid-rows-2 gap-px">
      {cells.map((src, i) => (
        <div key={i} className="relative overflow-hidden">
          <Image src={src} alt="" fill className="object-cover" sizes="150px" />
        </div>
      ))}
    </div>
  );
}
