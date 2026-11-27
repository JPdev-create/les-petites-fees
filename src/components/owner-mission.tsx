"use client";

import { useEffect, useState } from "react";
import { Clock, StickyNote, Zap, Shirt, Phone, XCircle, Save, Send, Hourglass, CalendarPlus } from "lucide-react";
import { missionTitle } from "@/lib/recurrence";
import type { Mission } from "@/lib/types";
import { capitalize, diffDays, formatDate, todayISO, missionWhen } from "@/lib/format";
import { ownerCancel, ownerRequestChange, ownerUpdateRequest } from "@/lib/actions";
import { useOwner } from "./owner-data";
import { Field, Modal, Spinner, StatusBadge, Toggle } from "./ui";
import { toast } from "./toaster";
import { askConfirm } from "@/components/confirm";

/**
 * Détail d'un passage côté client : modifier une demande en attente, demander un changement
 * sur un passage confirmé (validé ensuite par l'équipe), ajouter un 2e passage le même jour, ou annuler.
 */
export function OwnerMissionSheet({ mission, onClose, onAddSameDay }: { mission: Mission | null; onClose: () => void; onAddSameDay?: (date: string) => void }) {
  const { missions, settings } = useOwner();
  const m = mission ? missions.find((x) => x.id === mission.id) ?? mission : null;
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [linen, setLinen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mission) return;
    const c = mission.status === "CONFIRMED" ? mission.changeRequest : null;
    setTime((c && c.time !== undefined ? c.time : mission.time) ?? "");
    setNote(mission.status === "CONFIRMED" ? c?.note ?? "" : mission.ownerNote ?? "");
    setUrgent(c && c.urgent !== undefined ? c.urgent : !!mission.urgent);
    setLinen(c && c.extraLinen !== undefined ? c.extraLinen : !!mission.extraLinen);
  }, [mission]);

  if (!m) return null;
  const editable = m.status === "REQUESTED" && m.date >= todayISO();
  const cancellable = (m.status === "REQUESTED" || m.status === "CONFIRMED") && m.date >= todayISO();
  const late = diffDays(m.date, todayISO()) * 24 < settings.minNoticeHours;
  const dirty = time !== (m.time ?? "") || note !== (m.ownerNote ?? "") || urgent !== !!m.urgent || linen !== !!m.extraLinen;
  // Passage confirmé à venir : le client peut demander un changement, l'équipe le valide
  const changeable = m.status === "CONFIRMED" && m.date >= todayISO() && !m.dateTo;
  const pendingChange = changeable ? m.changeRequest : null;
  const wantsChange = time !== (m.time ?? "") || urgent !== !!m.urgent || linen !== !!m.extraLinen || !!note.trim();
  const sameAsPending = !!pendingChange && time === (pendingChange.time ?? m.time ?? "") && urgent === (pendingChange.urgent ?? !!m.urgent)
    && linen === (pendingChange.extraLinen ?? !!m.extraLinen) && note.trim() === (pendingChange.note ?? "");
  const sendChange = () => run(() => ownerRequestChange(m, {
    ...(time !== (m.time ?? "") ? { time: time || null } : {}),
    ...(urgent !== !!m.urgent ? { urgent } : {}),
    ...(linen !== !!m.extraLinen ? { extraLinen: linen } : {}),
    note: note.trim() || null,
  }), "Demande envoyée — nous vous confirmons par e-mail");

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
      title={missionTitle(m)}
      footer={
        changeable && wantsChange && !sameAsPending ? (
          <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={sendChange}>
            {busy ? <Spinner /> : <Send className="size-4" />} {pendingChange ? "Mettre à jour ma demande" : "Envoyer la demande de changement"}
          </button>
        ) : editable && dirty ? (
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

        {changeable && (
          <div className="space-y-4">
            {pendingChange ? (
              <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                <Hourglass className="mt-0.5 size-4 shrink-0" />
                <p className="flex-1">
                  Votre demande de changement a bien été envoyée. Le passage reste confirmé ; vous recevrez un e-mail dès que nous l&apos;aurons validée.{" "}
                  <button className="font-semibold underline" disabled={busy} onClick={() => run(() => ownerRequestChange(m, null), "Demande de changement retirée")}>Retirer ma demande</button>
                </p>
              </div>
            ) : (
              <p className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-400/10 dark:text-sky-200">
                Ce passage est confirmé. <strong>Inutile de l&apos;annuler</strong> : modifiez ce qu&apos;il faut ci-dessous (par ex. « Urgent » si de nouveaux voyageurs arrivent ce jour-là) et envoyez. Nous vous confirmons par e-mail.
              </p>
            )}
            <Toggle checked={urgent} onChange={setUrgent} label="Urgent" hint="De nouveaux voyageurs arrivent le jour même" />
            <Field label="Heure souhaitée" hint={m.time ? `Actuellement : ${m.time}` : "Actuellement : horaire libre"}><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Message pour l'équipe"><textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : nouveaux locataires à 16 h, merci de terminer avant" /></Field>
            <Toggle checked={linen} onChange={setLinen} label="Linge supplémentaire" />
            {m.ownerNote && <p className="muted flex gap-2 text-xs"><StickyNote className="size-3.5 shrink-0" />Note déjà transmise : {m.ownerNote}</p>}
          </div>
        )}

        {changeable ? null : editable ? (
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

        {onAddSameDay && m.date >= todayISO() && (m.status === "REQUESTED" || m.status === "CONFIRMED") && (
          <button className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300" onClick={() => { onAddSameDay(m.date); onClose(); }}>
            <CalendarPlus className="size-4" /> Ajouter un 2e passage ce jour-là
          </button>
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
              onClick={async () => (await askConfirm({ title: "Annuler ce passage ?", message: `${missionTitle(m)} — ${formatDate(m.date)}. Nous serons prévenus de l'annulation.`, confirmLabel: "Oui, annuler", cancelLabel: "Garder", danger: true })) && run(() => ownerCancel(m), "Passage annulé")}
            >
              <XCircle className="size-4" /> Annuler ce passage
            </button>
          ))}
      </div>
    </Modal>
  );
}
