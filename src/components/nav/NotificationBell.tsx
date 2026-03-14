"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  ruleName: string | null;
  ad: {
    id: string;
    brandName: string;
    productName: string | null;
    thumbnailUrl: string | null;
    velocityScore: number;
    velocityTier: string;
    platform: string;
  };
}

interface FetchResult {
  notifications: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const initialFetched = useRef(false);

  const fetchNotifications = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "15" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) return null;
    return res.json() as Promise<FetchResult>;
  }, []);

  // Initial load on mount
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;

    fetchNotifications().then((data) => {
      if (!data) return;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    });
  }, [fetchNotifications]);

  // Poll unread count every 60s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const data = await fetchNotifications();
      if (!data) return;
      setUnreadCount(data.unreadCount);
      // Prepend any new notifications not already in list
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = data.notifications.filter((n) => !existingIds.has(n.id));
        return newItems.length > 0 ? [...newItems, ...prev] : prev;
      });
    }, 60_000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleOpen() {
    if (!open) {
      setLoading(true);
      const data = await fetchNotifications();
      if (data) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
      setLoading(false);
    }
    setOpen((v) => !v);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/mark-read", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  }

  async function handleMarkOne(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchNotifications(nextCursor);
    if (data) {
      setNotifications((prev) => [...prev, ...data.notifications]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }

  function handleClickNotification(n: NotificationItem) {
    if (!n.isRead) handleMarkOne(n.id);
    setOpen(false);
    startTransition(() => router.push(`/ads/${n.ad.id}`));
  }

  const tierColor: Record<string, string> = {
    EXPLOSIVE: "text-success", HIGH: "text-accent", RISING: "text-warning", STEADY: "text-muted",
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 border border-border hover:bg-surface-3 transition-colors"
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface-2 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="text-4xl opacity-20">🔔</span>
                <p className="text-xs text-muted">No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={[
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-3",
                      !n.isRead ? "bg-accent/5" : "",
                    ].join(" ")}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                      {n.ad.thumbnailUrl ? (
                        <Image src={n.ad.thumbnailUrl} alt="" fill className="object-cover" sizes="40px" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg">📺</span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium leading-snug ${!n.isRead ? "text-foreground" : "text-foreground-2"}`}>
                        {n.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                        <span className={`font-semibold ${tierColor[n.ad.velocityTier] ?? "text-muted"}`}>
                          {n.ad.velocityTier === "EXPLOSIVE" ? "🔥 " : n.ad.velocityTier === "HIGH" ? "⚡ " : ""}
                          {Math.round(n.ad.velocityScore)}
                        </span>
                        {n.ruleName && <><span className="text-muted">·</span><span className="text-muted truncate">{n.ruleName}</span></>}
                        <span className="text-muted ml-auto shrink-0">{formatRelative(n.createdAt)}</span>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    )}
                  </button>
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="px-4 py-2 border-t border-border/60">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full rounded-lg py-1.5 text-[11px] text-muted hover:text-foreground transition-colors"
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-4 py-2">
            <a
              href="/alerts"
              className="block text-center text-[11px] text-muted hover:text-foreground transition-colors"
            >
              Manage alert rules →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.5 1.5C7.5 1.5 7.5 1 7.5 1C5 1 3 3 3 5.5V9L1.5 10.5V11.5H13.5V10.5L12 9V5.5C12 3 10 1 7.5 1ZM6 13C6 13.8 6.7 14.5 7.5 14.5C8.3 14.5 9 13.8 9 13H6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
