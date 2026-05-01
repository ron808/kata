"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

type ToastTone = "default" | "success" | "danger";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastCtx = createContext<{
  toast: (msg: string, tone?: ToastTone) => void;
} | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "default") => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3000);
  }, []);

  // Render the toast layer as a portal directly into <body> so it can't be
  // trapped or clipped by any parent stacking context / transform.
  const layer = (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        top: "max(env(safe-area-inset-top), 12px)",
        left: "12px",
        right: "12px",
        zIndex: 2147483000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{ pointerEvents: "auto" }}
            className={`rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md w-full max-w-md text-center ${
              item.tone === "success"
                ? "border-success/40 bg-success/10 text-success"
                : item.tone === "danger"
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-border-strong bg-bg-elevated/95 text-text-primary"
            }`}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {typeof document !== "undefined" && createPortal(layer, document.body)}
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
