"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Modal } from "./ui";

type Options = { title: string; message?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type Request = Options & { resolve: (ok: boolean) => void };

/**
 * Remplace window.confirm() par une fenêtre aux couleurs de l'application.
 * Usage : if (!(await askConfirm({ title: "Supprimer ?", danger: true }))) return;
 */
export function askConfirm(opts: Options): Promise<boolean> {
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent("lpf-confirm", { detail: { ...opts, resolve } })));
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    const on = (e: Event) => setReq((e as CustomEvent<Request>).detail);
    window.addEventListener("lpf-confirm", on);
    return () => window.removeEventListener("lpf-confirm", on);
  }, []);
  if (!req) return null;

  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={req.title}
      footer={
        <>
          <button className="btn-ghost" onClick={() => close(false)}>{req.cancelLabel ?? "Annuler"}</button>
          <button className={req.danger ? "btn-danger" : "btn-primary"} autoFocus onClick={() => close(true)}>{req.confirmLabel ?? "Confirmer"}</button>
        </>
      }
    >
      <div className="flex gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${req.danger ? "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300" : "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"}`}>
          {req.danger ? <AlertTriangle className="size-5" /> : <HelpCircle className="size-5" />}
        </span>
        <div className="muted pt-1 text-sm leading-relaxed">{req.message ?? "Voulez-vous continuer ?"}</div>
      </div>
    </Modal>
  );
}
