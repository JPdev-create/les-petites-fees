"use client";

import { createContext, useContext, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useLive, useSettings } from "@/lib/hooks";
import { addDays, todayISO } from "@/lib/format";
import type { Gite, Invoice, Mission, Profile, Settings, Submission } from "@/lib/types";

type OwnerData = {
  me: Profile;
  gites: Gite[];
  missions: Mission[];
  submissions: Submission[];
  invoices: Invoice[];
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
  const invoices = useLive<Invoice>((db) => query(collection(db, "invoices"), where("ownerEmail", "==", me.id)), [me.id]);
  const settings = useSettings();

  const value = useMemo<OwnerData>(
    () => ({
      me,
      gites: gites.data.filter((g) => g.active).sort((a, b) => a.name.localeCompare(b.name)),
      missions: [...missions.data].sort((a, b) => a.date.localeCompare(b.date)),
      submissions: submissions.data,
      invoices: invoices.data.filter((i) => i.status !== "DRAFT").sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
      settings,
      loading: gites.loading || missions.loading,
    }),
    [me, gites, missions, submissions, invoices, settings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOwner hors de OwnerDataProvider");
  return v;
}
