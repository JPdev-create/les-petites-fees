"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Menu, MoreHorizontal, MoreVertical, Share, Smartphone, SquarePlus, X, WifiOff } from "lucide-react";
import { Modal } from "@/components/ui";
import { BASE_PATH } from "@/lib/firebase";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Erreur de chargement d'un morceau du site : l'appli ouverte date d'avant une mise à jour. */
export const isStaleBuildError = (msg: string) => /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(msg);

/** Recharge la page une seule fois par minute (évite une boucle si le réseau est coupé). */
export function reloadForUpdate() {
  try {
    const last = Number(sessionStorage.getItem("update-reload") || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem("update-reload", String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}

export function PwaRegister() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
    }
    // Site mis à jour pendant que l'appli était ouverte : on recharge la nouvelle version
    const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const err = "reason" in e ? e.reason : e.error ?? e.message;
      if (isStaleBuildError(String(err?.name ?? "") + " " + String(err?.message ?? err))) reloadForUpdate();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950">
      <WifiOff className="size-3.5" /> Hors connexion — les données affichées peuvent ne pas être à jour
    </div>
  );
}

/* ---------- Installation de l'application (PWA) ---------- */

type Platform = "ios" | "ios-inapp" | "android" | "android-inapp" | "samsung" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|GSA\/|Snapchat|TikTok|LinkedInApp|\bwv\)/i.test(ua);
  if (ios) return inApp ? "ios-inapp" : "ios";
  if (/android/i.test(ua)) {
    if (inApp) return "android-inapp";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    return "android";
  }
  return "desktop";
}

const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone;

const getBip = () => (window as unknown as { __bip?: BIPEvent | null }).__bip ?? null;

/** État de l'installation : invitation native disponible (Android/Chrome), plateforme, déjà installée. */
export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setEvt(getBip());
    // Secours si le script du <head> n'a pas tourné
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __bip?: Event }).__bip = e;
      setEvt(e as BIPEvent);
    };
    const onReady = () => setEvt(getBip());
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("bip-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /** Ouvre la fenêtre d'installation native. Renvoie false si elle n'est pas disponible. */
  const promptInstall = async () => {
    const e = evt ?? getBip();
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    (window as unknown as { __bip?: null }).__bip = null; // une invitation ne sert qu'une fois
    setEvt(null);
    if (outcome === "accepted") setInstalled(true);
    return true;
  };

  return { evt, platform, installed, promptInstall };
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{n}</span>
    <span className="pt-0.5 text-sm leading-relaxed">{children}</span>
  </li>
);

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-zinc-50 px-1.5 py-0.5 text-xs font-semibold dark:bg-white/10">{children}</span>
);

function InstallSteps({ platform }: { platform: Platform }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + BASE_PATH + "/connexion/");
      setCopied(true);
    } catch {}
  };
  const copyBtn = (
    <button className="btn-secondary mt-4 w-full" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Lien copié" : "Copier le lien du site"}
    </button>
  );

  if (platform === "ios")
    return (
      <ol className="space-y-4">
        <Step n={1}>
          Touchez le bouton <Kbd><Share className="size-3.5" /> Partager</Kbd> — en bas de l&apos;écran dans Safari (en haut à droite sur iPad ou dans Chrome).
        </Step>
        <Step n={2}>
          Faites défiler et touchez <Kbd><SquarePlus className="size-3.5" /> Sur l&apos;écran d&apos;accueil</Kbd>.
        </Step>
        <Step n={3}>
          Touchez <Kbd>Ajouter</Kbd> en haut à droite. L&apos;icône Petites Fées apparaît sur votre écran d&apos;accueil.
        </Step>
      </ol>
    );
  if (platform === "ios-inapp" || platform === "android-inapp")
    return (
      <div>
        <p className="text-sm leading-relaxed">
          Vous avez ouvert le site depuis une autre application (Facebook, Messenger, Gmail…), qui ne permet pas l&apos;installation.
        </p>
        <ol className="mt-4 space-y-4">
          <Step n={1}>
            Touchez le menu <Kbd><MoreVertical className="size-3.5" /></Kbd> ou <Kbd><MoreHorizontal className="size-3.5" /></Kbd> puis « Ouvrir dans {platform === "ios-inapp" ? "Safari" : "Chrome"} » — ou copiez le lien ci-dessous et collez-le dans {platform === "ios-inapp" ? "Safari" : "Chrome"}.
          </Step>
          <Step n={2}>Revenez dans Mon compte et touchez à nouveau « Installer l&apos;application ».</Step>
        </ol>
        {copyBtn}
      </div>
    );
  if (platform === "samsung")
    return (
      <ol className="space-y-4">
        <Step n={1}>Touchez le menu <Kbd><Menu className="size-3.5" /></Kbd> en bas à droite.</Step>
        <Step n={2}>Touchez <Kbd>Ajouter page à</Kbd> puis <Kbd>Écran d&apos;accueil</Kbd>.</Step>
        <Step n={3}>Confirmez avec <Kbd>Ajouter</Kbd>.</Step>
      </ol>
    );
  if (platform === "android")
    return (
      <ol className="space-y-4">
        <Step n={1}>Touchez le menu <Kbd><MoreVertical className="size-3.5" /></Kbd> en haut à droite de Chrome.</Step>
        <Step n={2}>
          Touchez <Kbd>Installer l&apos;application</Kbd> (ou <Kbd>Ajouter à l&apos;écran d&apos;accueil</Kbd>).
        </Step>
        <Step n={3}>Confirmez avec <Kbd>Installer</Kbd>.</Step>
      </ol>
    );
  return (
    <ol className="space-y-4">
      <Step n={1}>
        Dans Chrome ou Edge, cliquez sur l&apos;icône <Kbd><Download className="size-3.5" /></Kbd> à droite de la barre d&apos;adresse (ou menu <Kbd><MoreVertical className="size-3.5" /></Kbd> → « Installer Les Petites Fées »).
      </Step>
      <Step n={2}>Confirmez avec <Kbd>Installer</Kbd>.</Step>
      <Step n={3}>Sur téléphone, ouvrez ce site et revenez ici : l&apos;installation y est encore plus pratique.</Step>
    </ol>
  );
}

/** Carte « Installer l'application » de la page Mon compte : installation directe sur Android, guidée sur iPhone. */
export function InstallAppCard() {
  const { evt, platform, installed, promptInstall } = useInstall();
  const [guide, setGuide] = useState(false);

  if (!platform) return null;

  const install = async () => {
    if (!(await promptInstall())) setGuide(true);
  };

  return (
    <section className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Smartphone className="size-4 text-brand-600" /> Application mobile
      </h2>
      {installed ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="size-4" /> L&apos;application est installée sur cet appareil.
        </p>
      ) : (
        <>
          <p className="muted text-sm">
            Installez Les Petites Fées sur votre {platform === "desktop" ? "appareil" : "téléphone"} : une icône sur l&apos;écran d&apos;accueil, ouverture en plein écran, sans passer par un store.
          </p>
          <button className="btn-primary w-full sm:w-auto" onClick={install}>
            <Download className="size-4" /> Installer l&apos;application
          </button>
          {platform.startsWith("ios") && !evt && <p className="muted text-xs">Sur iPhone, l&apos;installation se fait en 3 touches depuis le menu Partager — on vous guide.</p>}
        </>
      )}
      <Modal open={guide} onClose={() => setGuide(false)} title="Installer l'application" footer={<button className="btn-primary" onClick={() => setGuide(false)}>J&apos;ai compris</button>}>
        <InstallSteps platform={platform} />
      </Modal>
    </section>
  );
}

/** Invitation à installer l'application sur l'écran d'accueil (Android/Chrome + iPhone). */
export function InstallPrompt() {
  const { evt, platform, installed, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(true);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    try {
      setDismissed(Number(localStorage.getItem("install-dismissed") || 0) > Date.now() - 14 * 86400000);
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("install-dismissed", String(Date.now()));
    } catch {}
  };

  if (!platform || installed || dismissed) return null;
  const ios = platform === "ios" || platform === "ios-inapp";
  if (!ios && !evt) return null;
  return (
    <div className="card flex animate-in items-center gap-3 p-3.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <Download className="size-5" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Installer l&apos;application</p>
        <p className="muted text-xs">Accès en un geste depuis votre écran d&apos;accueil</p>
      </div>
      <button
        className="btn-primary btn-sm"
        onClick={async () => {
          if (await promptInstall()) dismiss();
          else setGuide(true);
        }}
      >
        Installer
      </button>
      <button onClick={dismiss} className="btn-ghost btn-sm px-2" aria-label="Plus tard">
        <X className="size-4" />
      </button>
      <Modal open={guide} onClose={() => setGuide(false)} title="Installer l'application" footer={<button className="btn-primary" onClick={() => setGuide(false)}>J&apos;ai compris</button>}>
        <InstallSteps platform={platform} />
      </Modal>
    </div>
  );
}
