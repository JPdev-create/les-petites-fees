"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Moon, Sun, X, Loader2, Sparkles } from "lucide-react";
import { STATUS } from "@/lib/format";
import { BASE_PATH } from "@/lib/firebase";

/* ---------- Logo : /public/logo.png s'il existe, sinon logo texte ---------- */
let logoAvailable: boolean | null = null;

export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  // Logo texte par défaut ; bascule sur l'image dès qu'elle est chargée
  const [img, setImg] = useState(logoAvailable === true);
  useEffect(() => {
    if (logoAvailable !== null) return setImg(logoAvailable);
    const probe = new Image();
    probe.onload = () => setImg((logoAvailable = true));
    probe.onerror = () => setImg((logoAvailable = false));
    probe.src = `${BASE_PATH}/logo.png`;
  }, []);
  if (img && !compact) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`${BASE_PATH}/logo.png`} alt="Les Petites Fées" className={`h-12 w-auto drop-shadow ${className}`} onError={() => setImg(false)} />;
  }
  return (
    <span className={`inline-flex items-center gap-2 text-white ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
        <Sparkles className="size-5" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[17px] font-semibold tracking-tight">Les Petites Fées</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">Service de nettoyage</span>
        </span>
      )}
    </span>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="size-7 animate-spin text-brand-500" />
    </div>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} className={`btn-ghost size-9 px-0 ${className}`} aria-label={dark ? "Mode clair" : "Mode sombre"} title={dark ? "Mode clair" : "Mode sombre"}>
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.REQUESTED;
  return (
    <span className={`badge ${s.tone}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
        <Icon className="size-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {text && <p className="muted mt-1 max-w-sm text-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = "brand", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: React.ElementType; tone?: "brand" | "amber" | "emerald" | "rose" | "violet"; href?: string }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
  };
  const body = (
    <div className="card h-full p-4 transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="muted text-[13px] font-medium">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

// Pile des fenêtres ouvertes : Échap ne ferme que celle du dessus,
// et le défilement de la page n'est rendu qu'à la fermeture de la dernière.
const modalStack: symbol[] = [];

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    modalStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === id) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      modalStack.splice(modalStack.indexOf(id), 1);
      if (!modalStack.length) document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full animate-in flex-col rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost size-9 px-0" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-brand-600" : "bg-zinc-300 dark:bg-white/15"}`}>
        <span className={`size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="muted block text-xs">{hint}</span>}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.value ? "bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>;
}
