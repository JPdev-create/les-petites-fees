"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { fb, BASE_PATH } from "@/lib/firebase";
import type { Profile, Role } from "@/lib/types";
import { Splash } from "./ui";
import { Onboarding } from "./onboarding";

type AuthState = { user: User | null; profile: Profile | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    const { auth, db } = fb();
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      if (!user?.email) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      const id = user.email.toLowerCase();
      let touched = false;
      unsubProfile = onSnapshot(
        doc(db, "profiles", id),
        (snap) => {
          const profile = snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null;
          setState({ user, profile: profile?.active ? profile : null, loading: false });
          if (profile && !touched) {
            touched = true;
            updateDoc(snap.ref, { lastLoginAt: new Date().toISOString() }).catch(() => {});
          }
        },
        () => setState({ user, profile: null, loading: false }),
      );
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export async function logout() {
  await signOut(fb().auth);
  window.location.assign(`${BASE_PATH}/connexion/`);
}

/** Protège un espace : redirige vers la connexion, ou affiche « accès refusé ». */
export function RequireRole({ role, children }: { role: Role; children: (profile: Profile) => React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/connexion/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    else if (profile && profile.role !== role) router.replace(profile.role === "ADMIN" ? "/admin/" : "/espace/");
  }, [loading, user, profile, role, router]);

  if (loading || !user || (profile && profile.role !== role)) return <Splash />;
  if (!profile) return <NoAccess user={user} />;
  return <>{children(profile)}</>;
}

function NoAccess({ user }: { user: User }) {
  return (
    <div className="grid min-h-dvh place-items-center p-5">
      <div className="card w-full max-w-sm p-7">
        <Onboarding user={user} />
      </div>
    </div>
  );
}
