"use client";

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000; 0 = persistent
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

function reducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.toast.id);
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  let counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timerMap.current.get(id));
    timerMap.current.delete(id);
    dispatch({ type: "REMOVE", id } as ToastAction);
  }, []);

  const toast = useCallback(
    (opts: Omit<Toast, "id">): string => {
      const id = `toast-${++counter.current}`;
      const duration = opts.duration ?? 4000;

      dispatch({ type: "ADD", toast: { ...opts, id } });

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timerMap.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ variant: "success", title, description }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) =>
      toast({ variant: "error", title, description, duration: 6000 }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ variant: "warning", title, description }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) =>
      toast({ variant: "info", title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// ── Toast container + individual toasts ──────────────────────────────────────

const VARIANT_STYLES: Record<
  ToastVariant,
  { bar: string; icon: string; iconBg: string }
> = {
  success: {
    bar: "bg-green-500",
    icon: "✓",
    iconBg: "bg-green-500/20 text-green-400",
  },
  error: {
    bar: "bg-danger",
    icon: "✕",
    iconBg: "bg-danger/20 text-danger",
  },
  warning: {
    bar: "bg-warning",
    icon: "!",
    iconBg: "bg-warning/20 text-warning",
  },
  info: {
    bar: "bg-primary",
    icon: "i",
    iconBg: "bg-primary/20 text-primary",
  },
};

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const s = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="alert"
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-slide-up"
    >
      {/* Accent bar */}
      <div className={`w-1 self-stretch shrink-0 ${s.bar}`} />

      {/* Icon */}
      <div
        className={`mt-3.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.iconBg}`}
      >
        {s.icon}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1 py-3.5 pr-1">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-muted leading-snug">
            {toast.description}
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="mt-3 mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
