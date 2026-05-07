"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "@phosphor-icons/react";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

export type ToastType = "success" | "error";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// ─── Single toast item ────────────────────────────────────────────────────────
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 4 s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "8px",
        background: "white",
        boxShadow: "0 4px 16px rgba(19,0,50,0.16), 0 1px 4px rgba(19,0,50,0.08)",
        border: `1px solid ${isSuccess ? "#C3EFDA" : "#FDDAD7"}`,
        fontFamily: DS_FONT,
        minWidth: "280px",
        maxWidth: "420px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "auto",
      }}
    >
      {isSuccess ? (
        <CheckCircle size={18} weight="fill" style={{ color: "#00B851", flexShrink: 0 }} />
      ) : (
        <XCircle size={18} weight="fill" style={{ color: "#D93025", flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
        {toast.message}
      </span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px",
          color: "rgba(19,0,50,0.4)",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}

// ─── Container rendered at top of a component tree ────────────────────────────
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
let _counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = "success") => {
    const id = `toast-${++_counter}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismissToast };
}
