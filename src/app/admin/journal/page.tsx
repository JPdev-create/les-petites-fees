"use client";

import { useState } from "react";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { Bell, Mail, Activity as ActivityIcon } from "lucide-react";
import { Empty, PageHeader, Segmented } from "@/components/ui";
import { useLive } from "@/lib/hooks";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { Activity, MailItem } from "@/lib/types";

const MAIL_STATUS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  SENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  SIMULATED: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  FAILED: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
};
const MAIL_LABEL: Record<string, string> = { PENDING: "En file d'attente", SENT: "Envoyé", SIMULATED: "Simulé", FAILED: "Échec" };

export default function JournalPage() {
  const [tab, setTab] = useState<"mail" | "activity">("mail");
  const mails = useLive<MailItem>((db) => query(collection(db, "mail"), orderBy("createdAt", "desc"), limit(150)), []);
  const acts = useLive<Activity>((db) => query(collection(db, "activity"), orderBy("at", "desc"), limit(150)), []);

  return (
    <>
      <PageHeader title="Journal" subtitle="Tous les e-mails envoyés et l'historique des actions." />
      <div className="mb-4"><Segmented value={tab} onChange={setTab} options={[{ value: "mail", label: "E-mails" }, { value: "activity", label: "Activité" }]} /></div>
      <div className="card overflow-hidden">
        {tab === "mail" ? (
          mails.data.length === 0 ? (
            <Empty icon={Mail} title="Aucun e-mail" text="Les confirmations, relances et factures envoyées apparaîtront ici." />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {mails.data.map((m) => (
                <details key={m.id} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <Mail className="size-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.subject}</p>
                      <p className="muted truncate text-xs">{m.to} · {timeAgo(m.createdAt)}</p>
                    </div>
                    <span className={`badge ${MAIL_STATUS[m.status]}`}>{MAIL_LABEL[m.status]}</span>
                  </summary>
                  <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-line dark:bg-white/5">
                    {m.text}
                    {m.error && <p className="mt-2 text-rose-600">Erreur : {m.error}</p>}
                    <p className="muted mt-2 text-xs">Créé {formatDateTime(m.createdAt)}{m.sentAt ? ` · envoyé ${formatDateTime(m.sentAt)}` : ""}</p>
                  </div>
                </details>
              ))}
            </div>
          )
        ) : acts.data.length === 0 ? (
          <Empty icon={ActivityIcon} title="Aucune activité" />
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {acts.data.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <Bell className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <div className="flex-1"><p>{a.message}</p><p className="muted text-xs">{a.by} · {formatDateTime(a.at)}</p></div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
