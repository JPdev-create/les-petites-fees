"use client";

import { useEffect, useMemo, useState } from "react";
import { Repeat, Save, Trash2 } from "lucide-react";
import type { Recurrence } from "@/lib/types";
import { DAYS_LONG, DAYS_SHORT, addDays, parseISODate, todayISO, weekdayIndex } from "@/lib/format";
import { describeOccurrence, occurrences, recurrenceLabel } from "@/lib/recurrence";
import { deleteRecurrence, saveRecurrence, type RecurrenceInput } from "@/lib/actions";
import { useAdmin } from "./admin-data";
import { Field, Modal, Segmented, Spinner, Toggle } from "./ui";
import { toast } from "./toaster";
import { askConfirm } from "./confirm";

type Kind = "W1" | "W2" | "M";

const blank = (giteId: string): RecurrenceInput => ({
  giteId, freq: "WEEKLY", interval: 1, days: [], nth: 1, weekday: 0, startDate: todayISO(),
  endDate: null, time: null, variants: [], note: null, active: true,
});

/** Création / modification d'un passage régulier, avec aperçu des prochaines dates. */
export function RecurrenceDialog({ open, onClose, recurrence, defaultGiteId }: { open: boolean; onClose: () => void; recurrence?: Recurrence | null; defaultGiteId?: string }) {
  const { gites, giteById, me } = useAdmin();
  const activeGites = useMemo(() => gites.filter((g) => g.active), [gites]);
  const [f, setF] = useState<RecurrenceInput>(blank(""));
  const [variants, setVariants] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (recurrence) {
      const { id: _id, generatedUntil: _g, createdAt: _c, updatedAt: _u, ...rest } = recurrence;
      void _id, void _g, void _c, void _u;
      setF({ ...blank(recurrence.giteId), ...rest });
      setVariants((recurrence.variants ?? []).join(", "));
    } else {
      setF(blank(defaultGiteId ?? ""));
      setVariants("");
    }
  }, [open, recurrence, defaultGiteId]);

  const set = <K extends keyof RecurrenceInput>(k: K, v: RecurrenceInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const kind: Kind = f.freq === "MONTHLY" ? "M" : f.interval === 2 ? "W2" : "W1";
  const setKind = (k: Kind) => setF((x) => ({ ...x, freq: k === "M" ? "MONTHLY" : "WEEKLY", interval: k === "W2" ? 2 : 1, weekday: k === "M" && x.days.length ? x.days[0] : x.weekday }));
  const toggleDay = (d: number) => set("days", f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort());
  const setStart = (date: string) => setF((x) => ({ ...x, startDate: date, days: x.freq === "WEEKLY" && !x.days.length && date ? [weekdayIndex(parseISODate(date))] : x.days }));

  const rule = { ...f, variants: variants.split(",").map((v) => v.trim()).filter(Boolean) };
  const valid = !!f.giteId && !!f.startDate && (f.freq === "MONTHLY" || f.days.length > 0);
  const today = todayISO();
  const preview = valid ? occurrences(rule, today, addDays(today, 400)).slice(0, 8) : [];
  const gite = giteById.get(f.giteId);

  const submit = async () => {
    if (!valid || !gite) return;
    setBusy(true);
    try {
      const n = await saveRecurrence(rule, recurrence?.id ?? null, gite, me.name);
      toast(`${recurrence ? "Passage régulier modifié" : "Passage régulier ajouté"} — ${n} passage(s) planifié(s)`);
      onClose();
    } catch (e) {
      console.error(e);
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!recurrence || !(await askConfirm({ title: "Supprimer ce passage régulier ?", message: "Les passages à venir de cette série sont retirés du calendrier. Les passages effectués, déplacés ou annulés à la main sont conservés.", confirmLabel: "Supprimer", danger: true }))) return;
    setBusy(true);
    try {
      await deleteRecurrence(recurrence, gite?.name ?? "", me.name);
      toast("Passage régulier supprimé");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={recurrence ? `Passage régulier — ${gite?.name ?? ""}` : "Nouveau passage régulier"}
      footer={
        <>
          {recurrence && <button className="btn-ghost mr-auto text-rose-600" disabled={busy} onClick={remove}><Trash2 className="size-4" /> Supprimer</button>}
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={busy || !valid} onClick={submit}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_17rem]">
        <div className="space-y-4">
          <Field label="Lieu">
            <select className="input" value={f.giteId} disabled={!!recurrence} onChange={(e) => set("giteId", e.target.value)}>
              <option value="">Choisir un lieu…</option>
              {activeGites.map((g) => <option key={g.id} value={g.id}>{g.name}{g.ownerName ? ` — ${g.ownerName}` : ""}</option>)}
            </select>
          </Field>
          <Segmented<Kind> value={kind} onChange={setKind} options={[{ value: "W1", label: "Chaque semaine" }, { value: "W2", label: "Tous les 15 jours" }, { value: "M", label: "Chaque mois" }]} />

          {f.freq === "WEEKLY" ? (
            <>
              <Field label={kind === "W2" ? "Premier passage" : "À partir du"} hint={kind === "W2" ? "Fixe la semaine de départ : la série revient ensuite une semaine sur deux." : undefined}>
                <input type="date" className="input" value={f.startDate} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <div>
                <span className="label">Jours</span>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_SHORT.map((d, i) => (
                    <button key={d} type="button" onClick={() => toggleDay(i)} className={`rounded-xl border py-2 text-sm font-semibold transition ${f.days.includes(i) ? "border-transparent bg-brand-600 text-white" : "border-[var(--border)] hover:bg-zinc-50 dark:hover:bg-white/5"}`}>
                      {d.replace(".", "")}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position dans le mois">
                  <select className="input" value={f.nth} onChange={(e) => set("nth", Number(e.target.value))}>
                    {[[1, "1er"], [2, "2e"], [3, "3e"], [4, "4e"], [-1, "Dernier"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Jour">
                  <select className="input" value={f.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                    {DAYS_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="À partir du"><input type="date" className="input" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure" hint={gite?.defaultTime ? `Par défaut : ${gite.defaultTime}` : undefined}>
              <input type="time" className="input" value={f.time ?? ""} onChange={(e) => set("time", e.target.value || null)} />
            </Field>
            <Field label="Jusqu'au (facultatif)">
              <input type="date" className="input" value={f.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} />
            </Field>
          </div>
          <Field label="Alternance (facultatif)" hint="Séparées par une virgule, ex. « Soirée, Journée » : la 1re s'applique au premier passage, puis elles alternent.">
            <input className="input" value={variants} onChange={(e) => setVariants(e.target.value)} placeholder="Soirée, Journée" />
          </Field>
          <Field label="Note interne"><input className="input" value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="Ex. : clés chez le voisin" /></Field>
          {recurrence && <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Série active" hint="En pause, les passages à venir sont retirés du calendrier." />}
        </div>

        <div>
          <p className="label flex items-center gap-1.5"><Repeat className="size-3.5" /> Prochains passages</p>
          {valid && <p className="muted mb-2 text-xs">{recurrenceLabel(rule)}</p>}
          {preview.length === 0 ? (
            <p className="muted text-sm">{valid ? "Aucun passage à venir." : "Choisissez le lieu et les jours."}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {preview.map((o) => <li key={o.date} className="rounded-lg bg-zinc-50 px-3 py-1.5 dark:bg-white/5">{describeOccurrence(o)}</li>)}
            </ul>
          )}
          {recurrence && <p className="muted mt-3 text-xs">En enregistrant, les passages à venir sont recalculés. Ceux que vous avez déplacés, annulés ou marqués effectués ne bougent pas.</p>}
        </div>
      </div>
    </Modal>
  );
}
