"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";

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

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-[68px] right-3 left-3 md:top-6 md:right-6 md:left-auto z-50 flex flex-col items-stretch md:items-end gap-2 pointer-events-none"
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
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md w-full md:max-w-sm md:w-auto ${
                item.tone === "success"
                  ? "border-success/40 bg-success/10 text-success"
                  : item.tone === "danger"
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-border-strong bg-bg-elevated/90 text-text-primary"
              }`}
            >
              {item.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
