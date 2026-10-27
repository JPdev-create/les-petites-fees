"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { useLive, useSettings } from "@/lib/hooks";
import { addDays, todayISO } from "@/lib/format";
import { extendRecurrence } from "@/lib/actions";
import { HORIZON_DAYS } from "@/lib/recurrence";
import type { Gite, Mission, Profile, Recurrence, Settings, Submission } from "@/lib/types";

type AdminData = {
  me: Profile;
  gites: Gite[];
  profiles: Profile[];
  owners: Profile[];
  missions: Mission[];
  submissions: Submission[];
  recurrences: Recurrence[];
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
  const recurrences = useLive<Recurrence>((db) => collection(db, "recurrences"), []);
  const settings = useSettings();

  // Prolonge les passages réguliers à l'ouverture (en plus de l'automatisation toutes les 30 min)
  const extending = useRef(false);
  useEffect(() => {
    if (extending.current || recurrences.loading || gites.loading) return;
    const soon = addDays(todayISO(), HORIZON_DAYS - 7);
    const due = recurrences.data.filter((r) => r.active && (r.generatedUntil ?? "") < soon);
    if (!due.length) return;
    extending.current = true;
    (async () => {
      for (const r of due) {
        const g = gites.data.find((x) => x.id === r.giteId);
        if (g?.active) await extendRecurrence(r, g).catch((e) => console.error(e));
      }
    })();
  }, [recurrences, gites]);

  const value = useMemo<AdminData>(() => {
    const giteById = new Map(gites.data.map((g) => [g.id, g]));
    return {
      me,
      gites: gites.data,
      profiles: profiles.data,
      owners: profiles.data.filter((p) => p.role === "OWNER"),
      missions: missions.data,
      submissions: submissions.data,
      recurrences: recurrences.data,
      settings,
      loading: gites.loading || profiles.loading || missions.loading,
      giteById,
      pending: missions.data.filter((m) => m.status === "REQUESTED"),
    };
  }, [me, gites, profiles, missions, submissions, recurrences, settings]);

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
      !!g.ownerEmail &&
      !submissions.some((s) => s.giteId === g.id && s.period === period) &&
      !missions.some((m) => m.giteId === g.id && m.date.startsWith(period) && m.status !== "CANCELLED" && m.status !== "REFUSED"),
  );
}
