"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type ToastTone = "default" | "success" | "danger";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  leaving: boolean;
}

const ToastCtx = createContext<{
  toast: (msg: string, tone?: ToastTone) => void;
} | null>(null);

let toastId = 0;
const subscribe = () => () => {};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  // The portal target only exists in the browser; render it after hydration so
  // the server and client trees match.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const toast = useCallback((message: string, tone: ToastTone = "default") => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, message, tone, leaving: false }]);
    // Fade out, then remove. Plain CSS keeps animation libraries off public pages.
    setTimeout(() => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    }, 3000);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3400);
  }, []);

  // Portal into <body> so no parent transform or stacking context can trap it.
  const layer = (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-3 z-[2147483000] flex flex-col items-center gap-2"
      style={{ top: "max(env(safe-area-inset-top), 0.75rem)" }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex min-h-11 max-w-md animate-[toast-in_0.45s_var(--ease-out)] items-center gap-2.5 rounded-full border-2 border-edge bg-ink px-4 py-2.5 text-[0.9375rem] font-medium text-ground shadow-sticker-sm transition-[opacity,transform] duration-300 ${
            item.leaving ? "-translate-y-2 opacity-0" : ""
          }`}
        >
          {item.tone === "success" ? (
            <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-sun text-on-sun">
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          ) : item.tone === "danger" ? (
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
          ) : null}
          {item.message}
        </div>
      ))}
    </div>
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {mounted && createPortal(layer, document.body)}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return { toast: (msg: string) => console.log("[toast]", msg) };
  }
  return ctx;
}
