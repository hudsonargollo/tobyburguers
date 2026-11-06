"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMounted } from "@/lib/use-mounted";
import { createPortal } from "react-dom";

type Variant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  title?: string;
  variant: Variant;
  duration: number;
};

type ToastInput = {
  message: string;
  title?: string;
  variant?: Variant;
  duration?: number;
};

type ToastOpts = Omit<ToastInput, "message" | "variant">;

type ToastApi = {
  toast: (input: ToastInput) => string;
  success: (message: string, opts?: ToastOpts) => string;
  error: (message: string, opts?: ToastOpts) => string;
  info: (message: string, opts?: ToastOpts) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast API. Must be used within <ToastProvider> (mounted in the root layout). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mounted = useMounted();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const startTimer = useCallback(
    (id: string, duration: number) => {
      const tm = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, tm);
    },
    [dismiss]
  );

  const push = useCallback(
    (input: ToastInput) => {
      const id =
        (globalThis.crypto?.randomUUID?.() as string | undefined) ??
        Math.random().toString(36).slice(2);
      const variant = input.variant ?? "info";
      const duration = input.duration ?? (variant === "error" ? 5000 : 4000);
      const next: Toast = { id, message: input.message, title: input.title, variant, duration };
      // keep only the most recent MAX_VISIBLE toasts
      setToasts((prev) => [...prev, next].slice(-MAX_VISIBLE));
      startTimer(id, duration);
      return id;
    },
    [startTimer]
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast: push,
      success: (message, opts) => push({ ...opts, message, variant: "success" }),
      error: (message, opts) => push({ ...opts, message, variant: "error" }),
      info: (message, opts) => push({ ...opts, message, variant: "info" }),
      dismiss,
    }),
    [push, dismiss]
  );

  const pause = useCallback((id: string) => {
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const resume = useCallback(
    (id: string, duration: number) => {
      if (!timers.current.has(id)) startTimer(id, duration);
    },
    [startTimer]
  );

  // clean up any pending timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((tm) => clearTimeout(tm));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-20 z-[9999] flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:bottom-24 sm:right-5 sm:items-end sm:p-0"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <ToastCard
                key={t.id}
                toast={t}
                onDismiss={() => dismiss(t.id)}
                onPause={() => pause(t.id)}
                onResume={() => resume(t.id, t.duration)}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: Toast;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const { variant } = toast;
  const accent =
    variant === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "error"
        ? "text-red-600 dark:text-red-400"
        : "text-accent-strong";
  const border =
    variant === "success"
      ? "border-emerald-500/35"
      : variant === "error"
        ? "border-red-500/35"
        : "border-accent/45";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      className={`pointer-events-auto flex w-[21rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border ${border} bg-surface p-4 text-ink shadow-[0_24px_60px_-20px_rgba(110,10,6,0.5)] animate-[toastin_.35s_cubic-bezier(.2,.8,.2,1)]`}
    >
      <span className={`mt-0.5 shrink-0 ${accent}`}>
        <VariantIcon variant={variant} />
      </span>
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold leading-snug">{toast.title}</p>}
        <p className={`text-sm leading-snug ${toast.title ? "mt-0.5 text-muted" : "font-medium"}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted transition hover:bg-cream-soft hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function VariantIcon({ variant }: { variant: Variant }) {
  if (variant === "success") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
