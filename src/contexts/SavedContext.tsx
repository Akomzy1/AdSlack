"use client";

/**
 * SavedContext
 *
 * Global client-side state for bookmarked ads. Mounted once at the dashboard
 * layout level. Fetches saved ad IDs on mount, then serves optimistic
 * save/unsave/createFolder operations to any component via useSaved().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedEntry {
  id: string;      // SavedAd.id (needed for DELETE)
  adId: string;
  folderId: string | null;
}

export interface FolderSummary {
  id: string;
  name: string;
  adCount: number;
  updatedAt: string;
  thumbnails: string[];
}

export interface SavedContextValue {
  /** adId → SavedEntry */
  savedMap: Map<string, SavedEntry>;
  folders: FolderSummary[];
  isInitialized: boolean;

  isSaved: (adId: string) => boolean;
  getSavedEntry: (adId: string) => SavedEntry | undefined;

  /** Save an ad, optionally to a folder. Optimistic. */
  save: (adId: string, folderId?: string | null) => Promise<void>;
  /** Unsave by adId. Optimistic. */
  unsave: (adId: string) => Promise<void>;
  /** Create a folder and add it to local state. */
  createFolder: (name: string) => Promise<FolderSummary>;
  /** Re-fetch folders from server. */
  refreshFolders: () => Promise<void>;
}

const SavedContext = createContext<SavedContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedMap, setSavedMap]         = useState<Map<string, SavedEntry>>(new Map());
  const [folders, setFolders]           = useState<FolderSummary[]>([]);
  const [isInitialized, setInitialized] = useState(false);
  const initRef = useRef(false);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    void (async () => {
      try {
        const [savedRes, foldersRes] = await Promise.all([
          fetch("/api/saved"),
          fetch("/api/folders"),
        ]);

        if (savedRes.ok) {
          const { saved } = await savedRes.json() as { saved: SavedEntry[] };
          const map = new Map<string, SavedEntry>();
          saved.forEach((s) => map.set(s.adId, s));
          setSavedMap(map);
        }

        if (foldersRes.ok) {
          const { folders: fl } = await foldersRes.json() as { folders: FolderSummary[] };
          setFolders(fl);
        }
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async (adId: string, folderId?: string | null) => {
    // Optimistic: create a temporary entry
    const tempEntry: SavedEntry = { id: `temp_${adId}`, adId, folderId: folderId ?? null };
    setSavedMap((prev) => new Map(prev).set(adId, tempEntry));

    try {
      const res = await fetch("/api/saved", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adId, folderId: folderId ?? null }),
      });

      if (!res.ok) throw new Error("Save failed");

      const { saved } = await res.json() as { saved: SavedEntry };
      setSavedMap((prev) => new Map(prev).set(adId, saved));

      // Update folder ad count if applicable
      if (folderId) {
        setFolders((prev) =>
          prev.map((f) => f.id === folderId ? { ...f, adCount: f.adCount + 1 } : f)
        );
      }
    } catch {
      // Revert optimistic update
      setSavedMap((prev) => {
        const next = new Map(prev);
        next.delete(adId);
        return next;
      });
    }
  }, []);

  // ── Unsave ────────────────────────────────────────────────────────────────
  const unsave = useCallback(async (adId: string) => {
    const entry = savedMap.get(adId);
    if (!entry) return;

    // Optimistic: remove immediately
    setSavedMap((prev) => {
      const next = new Map(prev);
      next.delete(adId);
      return next;
    });

    try {
      const res = await fetch(`/api/saved/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unsave failed");

      if (entry.folderId) {
        setFolders((prev) =>
          prev.map((f) => f.id === entry.folderId ? { ...f, adCount: Math.max(0, f.adCount - 1) } : f)
        );
      }
    } catch {
      // Revert
      setSavedMap((prev) => new Map(prev).set(adId, entry));
    }
  }, [savedMap]);

  // ── Create folder ─────────────────────────────────────────────────────────
  const createFolder = useCallback(async (name: string): Promise<FolderSummary> => {
    const res = await fetch("/api/folders", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Failed to create folder");
    }

    const { folder } = await res.json() as { folder: FolderSummary };
    setFolders((prev) => [...prev, folder]);
    return folder;
  }, []);

  // ── Refresh folders ───────────────────────────────────────────────────────
  const refreshFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (!res.ok) return;
    const { folders: fl } = await res.json() as { folders: FolderSummary[] };
    setFolders(fl);
  }, []);

  const isSaved      = useCallback((adId: string) => savedMap.has(adId), [savedMap]);
  const getSavedEntry = useCallback((adId: string) => savedMap.get(adId), [savedMap]);

  return (
    <SavedContext.Provider value={{
      savedMap, folders, isInitialized,
      isSaved, getSavedEntry,
      save, unsave, createFolder, refreshFolders,
    }}>
      {children}
    </SavedContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within SavedProvider");
  return ctx;
}
