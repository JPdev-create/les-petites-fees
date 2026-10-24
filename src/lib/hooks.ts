"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot, type DocumentData, type Query } from "firebase/firestore";
import { fb } from "./firebase";
import { DEFAULT_SETTINGS, type Settings } from "./types";

type State<T> = { data: T; loading: boolean; error: string | null };

/**
 * Abonnement temps réel à une requête Firestore.
 * `build` reçoit la base et renvoie la requête (ou null pour ne rien charger).
 */
export function useLive<T>(build: (db: ReturnType<typeof fb>["db"]) => Query<DocumentData> | null, deps: unknown[]): State<T[]> {
  const [state, setState] = useState<State<T[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = build(fb().db);
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), loading: false, error: null }),
      (err) => {
        console.error(err);
        setState({ data: [], loading: false, error: err.message });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useLiveDoc<T>(path: string | null): State<T | null> {
  const [state, setState] = useState<State<T | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    return onSnapshot(
      doc(fb().db, path),
      (snap) => setState({ data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [path]);
  return state;
}

export function useSettings(): Settings {
  const { data } = useLiveDoc<Settings>("settings/main");
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}

/** Lit un paramètre d'URL (?id=…). Les layouts enveloppent les pages dans <Suspense>. */
export function useParam(name: string) {
  return useSearchParams().get(name);
}
