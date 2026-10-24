"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, CalendarClock, CheckCheck, Trash2, RotateCcw, Zap, Shirt, MapPin, KeyRound, StickyNote, Plus, Repeat } from "lucide-react";
import type { Gite, Mission, MissionStatus } from "@/lib/types";
import { SOURCE, euros, formatDate, relativeDay, todayISO, periodOf, timeAgo, addDays } from "@/lib/format";
import { deleteMission, moveMission, setMissionsStatus, updateMission, adminCreateMissions } from "@/lib/actions";
import { useAdmin } from "./admin-data";
import { Field, Modal, Spinner, StatusBadge, Toggle } from "./ui";
import { MonthPicker } from "./month-picker";
import { toast } from "./toaster";

export function MissionLine({ m, onClick, showOwner = true, right }: { m: Mission; onClick?: () => void; showOwner?: boolean; right?: React.ReactNode }) {
  const rel = relativeDay(m.date);
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 ${onClick ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.03]" : ""}`}>
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: m.giteColor }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate font-semibold">{m.giteName}</p>
          {m.urgent && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"><Zap className="size-3" />Urgent</span>}
          {m.extraLinen && <Shirt className="size-3.5 text-violet-500" aria-label="Linge supplémentaire" />}
          {m.source === "ICAL" && <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">{m.icalSource || "iCal"}</span>}
        </div>
        <p className="muted truncate text-[13px]">
          {rel ? <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{rel} · </strong> : null}
          {formatDate(m.date, "medium")}
          {m.time ? ` · ${m.time}` : ""}
          {showOwner ? ` · ${m.ownerName}` : ""}
        </p>
      </div>
      {right ?? <StatusBadge status={m.status} />}
    </div>
  );
}

/** Fiche d'un passage : valider, refuser, déplacer, marquer effectué, notes. */
export function MissionDialog({ mission, onClose }: { mission: Mission | null; onClose: () => void }) {
  const { me, giteById, missions } = useAdmin();
  const live = mission ? missions.find((x) => x.id === mission.id) ?? mission : null;
  const [mode, setMode] = useState<"view" | "move" | "refuse">("view");
  const [date, setDate] = useState("");
  const [movePeriod, setMovePeriod] = useState(periodOf(todayISO()));
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mission) return;
    setMode("view");
    setDate(mission.date);
    setMovePeriod(periodOf(mission.date));
    setTime(mission.time ?? "");
    setReason("");
    setNote(mission.adminNote ?? "");
  }, [mission]);

  if (!live) return null;
  const m = live;
  const gite = giteById.get(m.giteId);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      onClose();
    } catch (e) {
      console.error(e);
      toast("Action impossible. Vérifiez votre connexion.", "error");
    } finally {
      setBusy(false);
    }
  };
  const sameDay = missions.filter((x) => x.date === m.date && x.id !== m.id && x.status !== "CANCELLED" && x.status !== "REFUSED");

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: m.giteColor }} /> {m.giteName}
        </span>
      }
      footer={
        mode === "move" ? (
          <>
            <button className="btn-ghost" onClick={() => setMode("view")}>Retour</button>
            <button className="btn-primary" disabled={busy || !date} onClick={() => run(() => moveMission(m, date, time || null, me.name, note), "Passage déplacé — le client sera prévenu")}>
              {busy && <Spinner />} Déplacer et confirmer
            </button>
          </>
        ) : mode === "refuse" ? (
          <>
            <button className="btn-ghost" onClick={() => setMode("view")}>Retour</button>
            <button className="btn-danger" disabled={busy} onClick={() => run(() => setMissionsStatus([m.id], "REFUSED", me.name, { refuseReason: reason.trim() || null }), "Demande refusée — le client sera prévenu")}>
              {busy && <Spinner />} Refuser la demande
            </button>
          </>
        ) : (
          <>
            {m.status === "REQUESTED" && (
              <>
                <button className="btn-secondary" onClick={() => setMode("refuse")}><X className="size-4" /> Refuser</button>
                <button className="btn-secondary" onClick={() => setMode("move")}><CalendarClock className="size-4" /> Autre date</button>
                <button className="btn-primary" disabled={busy} onClick={() => run(() => setMissionsStatus([m.id], "CONFIRMED", me.name), "Passage confirmé ✓")}>
                  <Check className="size-4" /> Confirmer
                </button>
              </>
            )}
            {m.status === "CONFIRMED" && (
              <>
                <button className="btn-secondary" onClick={() => setMode("move")}><CalendarClock className="size-4" /> Déplacer</button>
                <button className="btn-success" disabled={busy} onClick={() => run(() => setMissionsStatus([m.id], "DONE", me.name), "Passage marqué comme effectué")}>
                  <CheckCheck className="size-4" /> Effectué
                </button>
              </>
            )}
            {(m.status === "DONE" || m.status === "REFUSED" || m.status === "CANCELLED") && !m.invoiceId && (
              <button className="btn-secondary" disabled={busy} onClick={() => run(() => setMissionsStatus([m.id], m.status === "DONE" ? "CONFIRMED" : "REQUESTED", me.name), "Passage rouvert")}>
                <RotateCcw className="size-4" /> Rouvrir
              </button>
            )}
          </>
        )
      }
    >
      {mode === "move" ? (
        <div className="space-y-4">
          <p className="muted text-sm">Choisissez la nouvelle date. Le client recevra un e-mail avec la date modifiée.</p>
          <MonthPicker period={movePeriod} onPeriod={setMovePeriod} selected={new Set([date])} onToggle={setDate} minDate={todayISO()} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure"><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Message au client (facultatif)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : complet ce jour-là" /></Field>
          </div>
        </div>
      ) : mode === "refuse" ? (
        <Field label="Motif (envoyé au client)" hint="Facultatif, mais apprécié : « Nous sommes complets ce jour-là, le lendemain vous convient-il ? »">
          <textarea className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} />
            {m.urgent && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"><Zap className="size-3" /> Urgent</span>}
            {m.invoiceId && <span className="badge bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300">Facturé</span>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="muted text-xs">Date</dt><dd className="font-semibold">{formatDate(m.date)}</dd></div>
            <div><dt className="muted text-xs">Heure</dt><dd className="font-semibold">{m.time || "—"}</dd></div>
            <div><dt className="muted text-xs">Client</dt><dd className="font-semibold">{m.ownerName}</dd></div>
            <div><dt className="muted text-xs">Prix HTVA</dt><dd className="font-semibold">{euros(m.price)}</dd></div>
            <div><dt className="muted text-xs">Origine</dt><dd>{SOURCE[m.source]}{m.icalSource ? ` (${m.icalSource})` : ""}</dd></div>
            <div><dt className="muted text-xs">Mis à jour</dt><dd>{m.updatedAt ? timeAgo(m.updatedAt) : "—"}</dd></div>
          </dl>
          {gite && (
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-white/[0.03]">
              <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <a className="hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gite.address} ${gite.postalCode ?? ""} ${gite.city ?? ""}`)}`}>
                  {gite.address}{gite.city ? `, ${gite.postalCode ?? ""} ${gite.city}` : ""}
                </a>
              </p>
              {gite.accessInfo && <p className="flex gap-2"><KeyRound className="mt-0.5 size-4 shrink-0 text-brand-600" /> {gite.accessInfo}</p>}
              <p className="flex gap-2"><Shirt className="mt-0.5 size-4 shrink-0 text-brand-600" /> {gite.bedSets} parure(s) de lit · {gite.towelSets} jeu(x) de serviettes{m.extraLinen ? " + linge supplémentaire demandé" : ""}</p>
            </div>
          )}
          {m.ownerNote && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-400/20 dark:bg-amber-400/5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300"><StickyNote className="size-3.5" /> Note du client</p>
              {m.ownerNote}
            </div>
          )}
          {m.refuseReason && <p className="text-sm"><span className="muted">Motif du refus : </span>{m.refuseReason}</p>}
          {sameDay.length > 0 && (
            <p className="muted text-xs">Ce jour-là : {sameDay.length} autre(s) passage(s) — {sameDay.map((x) => x.giteName).join(", ")}</p>
          )}
          <Field label="Note interne">
            <div className="flex gap-2">
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible uniquement par les gestionnaires" />
              {note !== (m.adminNote ?? "") && (
                <button className="btn-secondary" onClick={() => updateMission(m.id, { adminNote: note }).then(() => toast("Note enregistrée"))}>OK</button>
              )}
            </div>
          </Field>
          {!m.invoiceId && (
            <button
              className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline"
              onClick={() => confirm("Supprimer définitivement ce passage ?") && run(() => deleteMission(m.id), "Passage supprimé")}
            >
              <Trash2 className="size-3.5" /> Supprimer ce passage
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Ajout manuel de passages par le gestionnaire (plusieurs dates d'un coup, récurrence). */
export function NewMissionDialog({ open, onClose, defaultDate, defaultGiteId }: { open: boolean; onClose: () => void; defaultDate?: string; defaultGiteId?: string }) {
  const { gites, me } = useAdmin();
  const activeGites = useMemo(() => gites.filter((g) => g.active), [gites]);
  const [giteId, setGiteId] = useState("");
  const [period, setPeriod] = useState(periodOf(todayISO()));
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<MissionStatus>("CONFIRMED");
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [repeat, setRepeat] = useState(0);

  useEffect(() => {
    if (!open) return;
    const d = defaultDate ?? todayISO();
    setGiteId(defaultGiteId ?? "");
    setPeriod(periodOf(d));
    setDates(defaultDate ? new Set([defaultDate]) : new Set());
    setTime("");
    setNote("");
    setRepeat(0);
  }, [open, defaultDate, defaultGiteId]);

  const gite = activeGites.find((g) => g.id === giteId);
  const allDates = useMemo(() => {
    const out = new Set(dates);
    if (repeat > 0) for (const d of dates) for (let i = 1; i <= repeat; i++) out.add(addDays(d, 7 * i));
    return [...out].sort();
  }, [dates, repeat]);

  const submit = async () => {
    if (!gite || !allDates.length) return;
    setBusy(true);
    try {
      await adminCreateMissions(gite, allDates, { time: time || null, status, note, notify }, me.name);
      toast(`${allDates.length} passage(s) ajouté(s)`);
      onClose();
    } catch (e) {
      console.error(e);
      toast("Impossible d'ajouter les passages", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter des passages"
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={busy || !gite || !allDates.length} onClick={submit}>
            {busy ? <Spinner /> : <Plus className="size-4" />} Ajouter {allDates.length > 0 ? `${allDates.length} passage${allDates.length > 1 ? "s" : ""}` : ""}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_15rem]">
        <div>
          <Field label="Lieu">
            <select className="input" value={giteId} onChange={(e) => setGiteId(e.target.value)}>
              <option value="">Choisir un gîte ou un lieu…</option>
              {activeGites.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.ownerName}</option>)}
            </select>
          </Field>
          <div className="mt-4">
            <MonthPicker
              period={period}
              onPeriod={setPeriod}
              selected={new Set(allDates)}
              onToggle={(d) => setDates((s) => { const n = new Set(s); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
            />
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Heure" hint={gite?.defaultTime ? `Par défaut : ${gite.defaultTime}` : undefined}>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Répéter chaque semaine">
            <div className="relative">
              <Repeat className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <select className="input pl-9" value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
                <option value={0}>Non</option>
                {[1, 2, 3, 4, 8, 12, 26, 52].map((n) => <option key={n} value={n}>+ {n} semaine{n > 1 ? "s" : ""}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Statut">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as MissionStatus)}>
              <option value="CONFIRMED">Confirmé</option>
              <option value="REQUESTED">En attente</option>
              <option value="DONE">Déjà effectué</option>
            </select>
          </Field>
          <Field label="Note interne"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          {status === "CONFIRMED" && <Toggle checked={notify} onChange={setNotify} label="Prévenir le client" hint="E-mail de confirmation" />}
        </div>
      </div>
    </Modal>
  );
}
