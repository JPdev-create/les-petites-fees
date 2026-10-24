"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { LinkIcon, AlertTriangle } from "lucide-react";
import { fb, BASE_PATH } from "@/lib/firebase";
import { ErrorNote, Spinner } from "@/components/ui";

/** Page d'arrivée du lien magique : finalise la connexion puis redirige. */
function MagicLinkInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [needEmail, setNeedEmail] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const finish = async (address: string) => {
    setBusy(true);
    setError(null);
    try {
      const { auth, db } = fb();
      const cred = await signInWithEmailLink(auth, address.trim().toLowerCase(), window.location.href);
      try {
        localStorage.removeItem("emailForSignIn");
      } catch {}
      const snap = await getDoc(doc(db, "profiles", (cred.user.email ?? "").toLowerCase()));
      const role = snap.exists() ? snap.data().role : null;
      const next = (params.get("next") || "").replace(BASE_PATH, "");
      const home = role === "ADMIN" ? "/admin/" : role === "OWNER" ? "/espace/" : "/connexion/";
      router.replace(next && role && next.startsWith(role === "ADMIN" ? "/admin" : "/espace") ? next : home);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code.includes("invalid-action-code") || code.includes("expired")) setInvalid(true);
      else if (code.includes("invalid-email")) setError("Cette adresse ne correspond pas au lien reçu.");
      else setError("Connexion impossible. Réessayez.");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { auth } = fb();
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setInvalid(true);
      return;
    }
    // Les liens envoyés par les relances automatiques portent l'adresse (?email=)
    let saved: string | null = params.get("email");
    try {
      saved = saved || localStorage.getItem("emailForSignIn");
    } catch {}
    if (saved) finish(saved);
    else setNeedEmail(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-800 to-brand-950 p-5">
      <div className="card w-full max-w-sm animate-in p-7">
        {invalid ? (
          <>
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              <AlertTriangle className="size-6" />
            </div>
            <h1 className="font-display text-xl font-semibold">Lien expiré ou déjà utilisé</h1>
            <p className="muted mt-2 text-sm">Pas de souci : demandez un nouveau lien, il arrive en quelques secondes.</p>
            <Link href="/connexion/" className="btn-primary mt-6 w-full">Recevoir un nouveau lien</Link>
          </>
        ) : needEmail ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finish(email);
            }}
          >
            <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <LinkIcon className="size-6" />
            </div>
            <h1 className="font-display text-xl font-semibold">Confirmez votre adresse</h1>
            <p className="muted mt-2 text-sm">Par sécurité, indiquez l&apos;adresse e-mail sur laquelle vous avez reçu ce lien.</p>
            <input className="input mt-5 h-12" type="email" required autoFocus placeholder="vous@exemple.be" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="mt-3"><ErrorNote error={error} /></div>
            <button className="btn-primary btn-lg mt-3 w-full" disabled={busy}>
              {busy && <Spinner />} Continuer
            </button>
          </form>
        ) : (
          <div className="py-6 text-center">
            <Spinner className="mx-auto size-7 text-brand-500" />
            <p className="mt-4 font-medium">Connexion en cours…</p>
            <div className="mt-3"><ErrorNote error={error} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkInner />
    </Suspense>
  );
}
