"use client";

import { createContext, useContext, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useLive, useSettings } from "@/lib/hooks";
import { addDays, todayISO } from "@/lib/format";
import type { Gite, Mission, Profile, Settings, Submission } from "@/lib/types";

type OwnerData = {
  me: Profile;
  gites: Gite[];
  missions: Mission[];
  submissions: Submission[];
  settings: Settings;
  loading: boolean;
};

const Ctx = createContext<OwnerData | null>(null);

/** Données du client connecté (filtrées par son e-mail, conformément aux règles Firestore). */
export function OwnerDataProvider({ me, children }: { me: Profile; children: React.ReactNode }) {
  const from = addDays(todayISO(), -400);
  const gites = useLive<Gite>((db) => query(collection(db, "gites"), where("ownerEmail", "==", me.id)), [me.id]);
  const missions = useLive<Mission>((db) => query(collection(db, "missions"), where("ownerEmail", "==", me.id), where("date", ">=", from)), [me.id, from]);
  const submissions = useLive<Submission>((db) => query(collection(db, "submissions"), where("ownerEmail", "==", me.id)), [me.id]);
  const settings = useSettings();

  const value = useMemo<OwnerData>(
    () => ({
      me,
      gites: gites.data.filter((g) => g.active).sort((a, b) => a.name.localeCompare(b.name)),
      missions: [...missions.data].sort((a, b) => a.date.localeCompare(b.date)),
      submissions: submissions.data,
      settings,
      loading: gites.loading || missions.loading,
    }),
    [me, gites, missions, submissions, settings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOwner hors de OwnerDataProvider");
  return v;
}
