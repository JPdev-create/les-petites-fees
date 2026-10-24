"use client";

import { createContext, useContext, useMemo } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { useLive, useSettings } from "@/lib/hooks";
import { addDays, todayISO } from "@/lib/format";
import type { Gite, Mission, Profile, Settings, Submission } from "@/lib/types";

type AdminData = {
  me: Profile;
  gites: Gite[];
  profiles: Profile[];
  owners: Profile[];
  missions: Mission[];
  submissions: Submission[];
  settings: Settings;
  loading: boolean;
  giteById: Map<string, Gite>;
  pending: Mission[];
};

const Ctx = createContext<AdminData | null>(null);

/** Données partagées par tout l'espace gestionnaire, synchronisées en temps réel. */
export function AdminDataProvider({ me, children }: { me: Profile; children: React.ReactNode }) {
  const from = addDays(todayISO(), -400);
  const gites = useLive<Gite>((db) => query(collection(db, "gites"), orderBy("name")), []);
  const profiles = useLive<Profile>((db) => query(collection(db, "profiles"), orderBy("name")), []);
  const missions = useLive<Mission>((db) => query(collection(db, "missions"), where("date", ">=", from), orderBy("date")), [from]);
  const submissions = useLive<Submission>((db) => query(collection(db, "submissions"), where("period", ">=", from.slice(0, 7))), [from]);
  const settings = useSettings();

  const value = useMemo<AdminData>(() => {
    const giteById = new Map(gites.data.map((g) => [g.id, g]));
    return {
      me,
      gites: gites.data,
      profiles: profiles.data,
      owners: profiles.data.filter((p) => p.role === "OWNER"),
      missions: missions.data,
      submissions: submissions.data,
      settings,
      loading: gites.loading || profiles.loading || missions.loading,
      giteById,
      pending: missions.data.filter((m) => m.status === "REQUESTED"),
    };
  }, [me, gites, profiles, missions, submissions, settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin hors de AdminDataProvider");
  return v;
}

/** Lieux sans planning connu pour un mois donné (ni déclaration, ni passage). */
export function missingPlanning(period: string, gites: Gite[], missions: Mission[], submissions: Submission[]) {
  return gites.filter(
    (g) =>
      g.active &&
      !submissions.some((s) => s.giteId === g.id && s.period === period) &&
      !missions.some((m) => m.giteId === g.id && m.date.startsWith(period) && m.status !== "CANCELLED" && m.status !== "REFUSED"),
  );
}
