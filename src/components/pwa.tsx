"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, WifiOff } from "lucide-react";
import { BASE_PATH } from "@/lib/firebase";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaRegister() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950">
      <WifiOff className="size-3.5" /> Hors connexion — les données affichées peuvent ne pas être à jour
    </div>
  );
}

/** Invitation à installer l'application sur l'écran d'accueil (Android/Chrome + iPhone). */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = Number(localStorage.getItem("install-dismissed") || 0) > Date.now() - 14 * 86400000;
    } catch {}
    if (standalone || dismissed) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      setHidden(false);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("install-dismissed", String(Date.now()));
    } catch {}
  };

  if (hidden) return null;
  return (
    <div className="card flex animate-in items-center gap-3 p-3.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <Download className="size-5" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Installer l&apos;application</p>
        {ios ? (
          <p className="muted text-xs">
            Touchez <Share className="inline size-3.5 -translate-y-px" /> puis « Sur l&apos;écran d&apos;accueil »
          </p>
        ) : (
          <p className="muted text-xs">Accès en un geste depuis votre écran d&apos;accueil</p>
        )}
      </div>
      {evt && (
        <button
          className="btn-primary btn-sm"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            dismiss();
          }}
        >
          Installer
        </button>
      )}
      <button onClick={dismiss} className="btn-ghost btn-sm px-2" aria-label="Plus tard">
        <X className="size-4" />
      </button>
    </div>
  );
}
