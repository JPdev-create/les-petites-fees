"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { ArrowLeft, CheckCircle2, Mail, MailCheck } from "lucide-react";
import { fb, BASE_PATH } from "@/lib/firebase";
import { sendLoginLink } from "@/lib/actions";
import { AuthProvider, useAuth, logout } from "@/components/auth";
import { ErrorNote, Logo, Spinner, ThemeToggle } from "@/components/ui";

function firebaseError(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-email")) return "Cette adresse e-mail ne semble pas valide.";
  if (code.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (code.includes("popup-closed")) return "Fenêtre Google fermée avant la fin.";
  if (code.includes("network")) return "Pas de connexion internet.";
  if (code.includes("quota")) return "Limite d'envoi atteinte pour aujourd'hui. Utilisez Google ou réessayez demain.";
  return "Une erreur est survenue. Réessayez.";
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = (params.get("next") || "").replace(BASE_PATH, "");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("emailForSignIn");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (profile) {
      const home = profile.role === "ADMIN" ? "/admin/" : "/espace/";
      const ok = next && next.startsWith(profile.role === "ADMIN" ? "/admin" : "/espace");
      router.replace(ok ? next : home);
    }
  }, [loading, user, profile, next, router]);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError(firebaseError(e));
    } finally {
      setBusy(null);
    }
  };

  const google = () =>
    withBusy("google", async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(fb().auth, provider);
      } catch (e) {
        // Fenêtres bloquées (certaines applis installées) : redirection pleine page
        if ((e as { code?: string }).code === "auth/popup-blocked") await signInWithRedirect(fb().auth, provider);
        else throw e;
      }
    });

  const link = (e: React.FormEvent) => {
    e.preventDefault();
    withBusy("link", async () => {
      await sendLoginLink(email, next);
      try {
        localStorage.setItem("emailForSignIn", email.trim().toLowerCase());
      } catch {}
      setSent(true);
    });
  };


  // Connecté mais adresse inconnue
  if (!loading && user && !profile) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-semibold">Adresse non reconnue</h1>
        <p className="muted mt-2 text-sm">
          Vous êtes connecté avec <strong className="text-zinc-800 dark:text-zinc-200">{user.email}</strong>, mais cette adresse n&apos;est pas enregistrée chez Les Petites Fées.
          Utilisez l&apos;adresse que vous nous avez communiquée, ou contactez-nous.
        </p>
        <button className="btn-secondary mt-6 w-full" onClick={() => logout()}>
          Utiliser une autre adresse
        </button>
      </Shell>
    );
  }

  if (sent) {
    return (
      <Shell>
        <div className="mb-5 grid size-14 animate-pop place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
          <MailCheck className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Vérifiez vos e-mails</h1>
        <p className="muted mt-2">
          Nous avons envoyé un lien de connexion à <strong className="text-zinc-800 dark:text-zinc-200">{email}</strong>. Touchez-le pour entrer directement dans votre espace, sans mot de passe.
        </p>
        <ul className="muted mt-5 space-y-2 text-sm">
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" /> Ouvrez le lien sur l&apos;appareil de votre choix</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" /> Pas reçu ? Regardez dans les courriers indésirables</li>
        </ul>
        <button className="btn-ghost mt-6 -ml-3" onClick={() => setSent(false)}>
          <ArrowLeft className="size-4" /> Modifier l&apos;adresse
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-[26px] font-semibold tracking-tight">Bienvenue 👋</h1>
      <p className="muted mt-1.5">Connectez-vous en un clic pour encoder vos dates de nettoyage.</p>

      <button onClick={google} disabled={!!busy} className="btn-secondary mt-8 h-14 w-full rounded-2xl text-base shadow-sm">
        {busy === "google" ? <Spinner /> : <GoogleIcon />}
        Se connecter avec Google
      </button>
      {!showEmail && <div className="mt-3"><ErrorNote error={error} /></div>}
      <p className="muted mt-3 text-center text-xs">Utilisez le compte Google lié à l&apos;adresse e-mail que vous nous avez communiquée.</p>

      {showEmail ? (
        <form onSubmit={link} className="mt-8 animate-in space-y-3 border-t border-[var(--border)] pt-6">
          <label className="block">
            <span className="label">Votre adresse e-mail</span>
            <input className="input h-12" type="email" required autoFocus autoComplete="email" inputMode="email" placeholder="vous@exemple.be" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <ErrorNote error={error} />
          <button className="btn-primary btn-lg w-full" disabled={!!busy}>
            {busy === "link" ? <Spinner /> : <Mail className="size-5" />}
            Recevoir un lien de connexion
          </button>
          <p className="muted text-center text-xs">Un lien sécurisé vous est envoyé : touchez-le pour vous connecter.</p>
        </form>
      ) : (
        <button
          onClick={() => {
            setShowEmail(true);
            setError(null);
          }}
          className="mx-auto mt-10 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          <Mail className="size-4" /> Pas de compte Google ? Recevoir un lien par e-mail
        </button>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <Link href="/"><Logo className="!h-20" /></Link>
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight">Vos nettoyages planifiés en 30 secondes.</p>
          <p className="mt-4 text-white/75">Touchez vos dates, nous nous occupons du reste. Confirmation par e-mail, historique et factures au même endroit.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
            {[["1", "Connexion en 1 clic"], ["2", "Touchez vos dates"], ["3", "C'est confirmé ✨"]].map(([n, t]) => (
              <div key={n} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <span className="font-display text-2xl font-semibold text-brand-200">{n}</span>
                <p className="mt-1 text-white/85">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex flex-col">
        <div className="flex items-center justify-between bg-brand-800 px-4 py-3 lg:bg-transparent lg:px-8 lg:py-6">
          <Link href="/" className="lg:hidden"><Logo compact={false} className="!h-10" /></Link>
          <Link href="/" className="muted hidden items-center gap-1.5 text-sm hover:text-zinc-900 lg:inline-flex dark:hover:text-white">
            <ArrowLeft className="size-4" /> Accueil
          </Link>
          <ThemeToggle className="text-white lg:text-inherit" />
        </div>
        <div className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center">
          <div className="w-full max-w-sm animate-in">{children}</div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <Suspense>
        <LoginInner />
      </Suspense>
    </AuthProvider>
  );
}
