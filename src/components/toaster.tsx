"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

export function toast(message: string, type: Toast["type"] = "success") {
  window.dispatchEvent(new CustomEvent("lpf-toast", { detail: { message, type } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const t = { id: ++id, message, type };
      setToasts((x) => [...x.slice(-2), t]);
      setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 4200);
    };
    window.addEventListener("lpf-toast", onToast);
    return () => window.removeEventListener("lpf-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-in items-start gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl shadow-black/20 dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Icon className={`mt-0.5 size-4 shrink-0 ${t.type === "success" ? "text-emerald-400 dark:text-emerald-600" : t.type === "error" ? "text-rose-400 dark:text-rose-600" : "text-sky-400"}`} />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-60 hover:opacity-100" aria-label="Fermer">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
