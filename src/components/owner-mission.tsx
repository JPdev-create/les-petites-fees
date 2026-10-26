"use client";

import { useEffect, useState } from "react";
import { Clock, StickyNote, Zap, Shirt, Phone, XCircle, Save } from "lucide-react";
import type { Mission } from "@/lib/types";
import { capitalize, diffDays, formatDate, todayISO, missionWhen } from "@/lib/format";
import { ownerCancel, ownerUpdateRequest } from "@/lib/actions";
import { useOwner } from "./owner-data";
import { Field, Modal, Spinner, StatusBadge, Toggle } from "./ui";
import { toast } from "./toaster";
import { askConfirm } from "@/components/confirm";

/** Détail d'un passage côté client : modifier une demande en attente, ou annuler. */
export function OwnerMissionSheet({ mission, onClose }: { mission: Mission | null; onClose: () => void }) {
  const { missions, settings } = useOwner();
  const m = mission ? missions.find((x) => x.id === mission.id) ?? mission : null;
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [linen, setLinen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mission) return;
    setTime(mission.time ?? "");
    setNote(mission.ownerNote ?? "");
    setUrgent(!!mission.urgent);
    setLinen(!!mission.extraLinen);
  }, [mission]);

  if (!m) return null;
  const editable = m.status === "REQUESTED" && m.date >= todayISO();
  const cancellable = (m.status === "REQUESTED" || m.status === "CONFIRMED") && m.date >= todayISO();
  const late = diffDays(m.date, todayISO()) * 24 < settings.minNoticeHours;
  const dirty = time !== (m.time ?? "") || note !== (m.ownerNote ?? "") || urgent !== !!m.urgent || linen !== !!m.extraLinen;

  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      onClose();
    } catch (e) {
      console.error(e);
      toast("Action impossible pour le moment.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={m.giteName}
      footer={
        editable && dirty ? (
          <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={() => run(() => ownerUpdateRequest(m, { time: time || null, ownerNote: note.trim() || null, urgent, extraLinen: linen }), "Demande mise à jour")}>
            {busy ? <Spinner /> : <Save className="size-4" />} Enregistrer
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-xl font-semibold">{capitalize(missionWhen(m, "long"))}</p>
          <StatusBadge status={m.status} />
        </div>
        {m.status === "REQUESTED" && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">{m.dateTo ? "Votre demande a bien été reçue. Nous choisirons un jour dans cette période et vous recevrez un e-mail de confirmation avec la date retenue." : "Votre demande a bien été reçue. Vous recevrez un e-mail dès qu'elle sera confirmée."}</p>}
        {m.status === "REFUSED" && m.refuseReason && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-400/10 dark:text-rose-200">{m.refuseReason}</p>}

        {editable ? (
          <div className="space-y-4">
            <Field label="Heure souhaitée"><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Message pour l'équipe"><textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : arrivée des prochains voyageurs à 15 h" /></Field>
            <Toggle checked={urgent} onChange={setUrgent} label="Urgent" hint="Arrivée de voyageurs le jour même" />
            <Toggle checked={linen} onChange={setLinen} label="Linge supplémentaire" />
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Clock className="size-4 text-brand-600" />{m.time ?? "Horaire à convenir"}</li>
            {m.urgent && <li className="flex items-center gap-2"><Zap className="size-4 text-rose-500" />Urgent</li>}
            {m.extraLinen && <li className="flex items-center gap-2"><Shirt className="size-4 text-violet-500" />Linge supplémentaire</li>}
            {m.ownerNote && <li className="flex gap-2"><StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />{m.ownerNote}</li>}
          </ul>
        )}

        {cancellable &&
          (late ? (
            <div className="rounded-2xl border border-[var(--border)] p-4 text-sm">
              <p className="font-medium">Annulation de dernière minute</p>
              <p className="muted mt-1">Le passage est dans moins de {settings.minNoticeHours} h : appelez-nous pour l&apos;annuler.</p>
              <a href={`tel:${settings.companyPhone.replace(/\s/g, "")}`} className="btn-secondary mt-3"><Phone className="size-4" /> {settings.companyPhone}</a>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:underline"
              disabled={busy}
              onClick={async () => (await askConfirm({ title: "Annuler ce passage ?", message: `${m.giteName} — ${formatDate(m.date)}. Nous serons prévenus de l'annulation.`, confirmLabel: "Oui, annuler", cancelLabel: "Garder", danger: true })) && run(() => ownerCancel(m), "Passage annulé")}
            >
              <XCircle className="size-4" /> Annuler ce passage
            </button>
          ))}
      </div>
    </Modal>
  );
}
