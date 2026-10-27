"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Plus, X, RefreshCw, Link2, Info, CalendarPlus, Phone, Mail, Navigation, UserRound, AlertCircle, Repeat } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { MissionDialog, MissionLine, NewMissionDialog } from "@/components/mission-admin";
import { RecurrenceDialog } from "@/components/recurrence-admin";
import { recurrenceLabel } from "@/lib/recurrence";
import { Field, PageHeader, Segmented, Spinner, Toggle } from "@/components/ui";
import { durationLabel, giteUnitPrice, isHourly } from "@/lib/pricing";
import { toast } from "@/components/toaster";
import { askConfirm } from "@/components/confirm";
import { useParam } from "@/lib/hooks";
import { deleteGite, saveGite, saveSettings } from "@/lib/actions";
import { COLORS, KIND, euros, formatDateTime, todayISO } from "@/lib/format";
import type { Gite, IcalFeed, Mission, Recurrence } from "@/lib/types";

type Form = Omit<Gite, "id">;

const empty = (price: number): Form => ({
  name: "", kind: "GITE", ownerEmail: "", ownerName: "", address: "", postalCode: "", city: "", accessInfo: "", notes: "",
  bedrooms: 2, bathrooms: 1, capacity: 4, bedSets: 2, towelSets: 4, price, durationMin: 120, defaultTime: "11:00",
  color: COLORS[Math.floor(Math.random() * COLORS.length)], icalFeeds: [], active: true,
});

export default function PlaceForm() {
  const id = useParam("id");
  const preClient = useParam("client");
  const router = useRouter();
  const { gites, owners, missions, recurrences, me, settings, loading } = useAdmin();
  const existing = gites.find((g) => g.id === id);
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Mission | null>(null);
  const [adding, setAdding] = useState(false);
  const [series, setSeries] = useState<Recurrence | "new" | null>(null);

  useEffect(() => {
    if (loading) return;
    if (id && existing) {
      const { id: _id, ...rest } = existing;
      void _id;
      setF({ ...empty(settings.defaultPrice), ...rest, icalFeeds: rest.icalFeeds ?? [] });
    } else if (!id) {
      setF({ ...empty(settings.defaultPrice), ownerEmail: preClient ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loading, existing?.updatedAt]);

  const history = useMemo(() => missions.filter((m) => m.giteId === id).sort((a, b) => b.date.localeCompare(a.date)), [missions, id]);
  const today = todayISO();

  if (!loading && id && !existing)
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <p className="font-display text-lg font-semibold">Lieu introuvable</p>
        <p className="muted mt-1 text-sm">Ce lieu a peut-être été supprimé.</p>
        <Link href="/admin/lieux/" className="btn-primary mt-5">Voir tous les lieux</Link>
      </div>
    );
  if (!f) return <div className="grid h-64 place-items-center"><Spinner className="size-6 text-brand-500" /></div>;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => (x ? { ...x, [k]: v } : x));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const owner = owners.find((o) => o.id === f.ownerEmail);
    if (f.ownerEmail && !owner) return toast("Choisissez le client propriétaire", "error");
    setBusy(true);
    try {
      const feeds = f.icalFeeds.filter((x) => x.url.trim()).map((x) => ({ label: x.label.trim() || "iCal", url: x.url.trim() }));
      const newId = await saveGite({ ...f, pricingMode: f.pricingMode ?? "FLAT", hourlyRate: f.hourlyRate ?? 0, price: giteUnitPrice(f), ownerName: owner?.name ?? "", icalFeeds: feeds }, id, me.name);
      toast(id ? "Fiche enregistrée" : "Lieu créé ✨");
      if (!id) router.replace(`/admin/lieux/fiche/?id=${newId}`);
    } catch (err) {
      console.error(err);
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !(await askConfirm({ title: `Supprimer « ${existing.name} » ?`, message: "Les passages à venir de ce lieu seront supprimés ; les passages déjà effectués sont conservés. Astuce : vous pouvez plutôt le désactiver (interrupteur « Lieu actif »).", confirmLabel: "Supprimer le lieu", danger: true }))) return;
    await deleteGite(existing, me.name);
    toast("Lieu supprimé");
    router.replace("/admin/lieux/");
  };

  const setFeed = (i: number, patch: Partial<IcalFeed>) => set("icalFeeds", f.icalFeeds.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // Les fenêtres sont hors du <form> : leurs boutons ne doivent pas enregistrer la fiche.
  return (
    <>
    <form onSubmit={submit}>
      <Link href="/admin/lieux/" className="muted mb-3 inline-flex items-center gap-1 text-sm hover:text-zinc-900 dark:hover:text-white"><ArrowLeft className="size-4" /> Tous les lieux</Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="size-4 rounded-full" style={{ background: f.color }} />
            {id ? f.name || "Lieu" : "Nouveau lieu"}
          </span>
        }
        subtitle={id ? `${KIND[f.kind]} · ${f.ownerName || "sans compte client"}` : "Renseignez les informations du gîte, de l'appartement ou du bureau."}
        actions={
          <>
            {id && <button type="button" className="btn-secondary" onClick={() => setAdding(true)}><CalendarPlus className="size-4" /> Planifier</button>}
            <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <Save className="size-4" />} Enregistrer</button>
          </>
        }
      />

      {existing?.pendingReview && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="flex-1"><strong>Nouveau lieu ajouté par {existing.ownerName}.</strong> Vérifiez les informations et fixez le tarif d&apos;un passage, puis cliquez sur « Enregistrer » pour le valider.</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="font-display font-semibold">Informations</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Nom du lieu"><input className="input" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Gîte du Moulin" /></Field>
              <Field label="Type">
                <select className="input" value={f.kind} onChange={(e) => set("kind", e.target.value as Gite["kind"])}>
                  {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Client propriétaire" hint={<>Le client verra ce lieu dans son espace. Sans compte client, le lieu n&apos;est visible que par les gestionnaires. <Link href="/admin/clients/" className="underline">Gérer les clients</Link></>}>
              <select className="input" value={f.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)}>
                <option value="">Aucun compte client (géré en interne)</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}{o.company ? ` (${o.company})` : ""} — {o.email}</option>)}
              </select>
            </Field>
            <Field label="Adresse"><input className="input" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Rue du Village 12" /></Field>
            <div className="grid grid-cols-[8rem_1fr] gap-4">
              <Field label="Code postal"><input className="input" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="6900" /></Field>
              <Field label="Localité"><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Marche-en-Famenne" /></Field>
            </div>
            <Field label="Accès" hint="Code de la boîte à clés, alarme, parking… (visible par les gestionnaires et le client)">
              <textarea className="input" value={f.accessInfo} onChange={(e) => set("accessInfo", e.target.value)} placeholder="Boîte à clés à gauche de la porte — code 1234" />
            </Field>
            <Field label="Spécificités"><textarea className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Animaux acceptés, linge fourni par le propriétaire, poubelles le mardi…" /></Field>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display font-semibold">Caractéristiques & linge</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Field label="Chambres"><input type="number" min={0} className="input" value={f.bedrooms} onChange={(e) => set("bedrooms", +e.target.value)} /></Field>
              <Field label="Sdb"><input type="number" min={0} className="input" value={f.bathrooms} onChange={(e) => set("bathrooms", +e.target.value)} /></Field>
              <Field label="Personnes"><input type="number" min={0} className="input" value={f.capacity} onChange={(e) => set("capacity", +e.target.value)} /></Field>
              <Field label="Parures"><input type="number" min={0} className="input" value={f.bedSets} onChange={(e) => set("bedSets", +e.target.value)} /></Field>
              <Field label="Serviettes"><input type="number" min={0} className="input" value={f.towelSets} onChange={(e) => set("towelSets", +e.target.value)} /></Field>
            </div>
            <p className="hint">Parures et jeux de serviettes à changer à chaque passage : utilisés pour prévoir la blanchisserie.</p>
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold"><RefreshCw className="size-4 text-violet-500" /> Synchronisation Airbnb / Booking</h2>
              <button type="button" className="btn-secondary btn-sm" onClick={() => set("icalFeeds", [...f.icalFeeds, { label: f.icalFeeds.length ? "Booking" : "Airbnb", url: "" }])}><Plus className="size-3.5" /> Ajouter un calendrier</button>
            </div>
            <p className="muted flex gap-2 text-sm"><Info className="mt-0.5 size-4 shrink-0" />Collez le lien d&apos;export iCal de chaque plateforme. Un nettoyage est créé automatiquement le jour de chaque départ de voyageurs, déplacé si la réservation change, et annulé si elle est annulée.</p>
            {f.icalFeeds.map((feed, i) => (
              <div key={i} className="flex gap-2">
                <select className="input w-36 shrink-0" value={feed.label} onChange={(e) => setFeed(i, { label: e.target.value })}>
                  {["Airbnb", "Booking", "Abritel", "Gîtes de Wallonie", "Autre"].map((x) => <option key={x}>{x}</option>)}
                </select>
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input className="input pl-9" type="url" placeholder="https://www.airbnb.fr/calendar/ical/….ics" value={feed.url} onChange={(e) => setFeed(i, { url: e.target.value })} />
                </div>
                <button type="button" className="btn-ghost size-11 px-0" onClick={() => set("icalFeeds", f.icalFeeds.filter((_, j) => j !== i))} aria-label="Retirer"><X className="size-4" /></button>
              </div>
            ))}
            {existing?.icalLastSync && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="muted">Dernière synchro : {formatDateTime(existing.icalLastSync)}</span>
                {existing.icalLastError && <span className="text-amber-700 dark:text-amber-300">⚠ {existing.icalLastError}</span>}
              </div>
            )}
            {f.icalFeeds.length > 0 && (
              <button type="button" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300" onClick={() => saveSettings({ syncRequestedAt: new Date().toISOString() }).then(() => toast("Synchronisation demandée — elle sera faite au prochain passage automatique"))}>
                Demander une synchronisation maintenant
              </button>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {(() => {
            const o = owners.find((x) => x.id === f.ownerEmail);
            if (!o) return null;
            const full = `${f.address} ${f.postalCode ?? ""} ${f.city ?? ""}`.trim();
            return (
              <section className="card space-y-3 p-5">
                <h2 className="flex items-center gap-2 font-display font-semibold"><UserRound className="size-4 text-brand-600" /> Propriétaire</h2>
                <div className="text-sm">
                  <p className="font-semibold">{o.name}{o.company ? <span className="muted font-normal"> · {o.company}</span> : null}</p>
                  {o.phone && <p className="muted">{o.phone}</p>}
                  <p className="muted break-all">{o.email}</p>
                  {o.billingAddress && <p className="muted mt-1 whitespace-pre-line text-xs">Adresse : {o.billingAddress}</p>}
                  {o.vatNumber && <p className="muted text-xs">TVA {o.vatNumber}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {o.phone ? <a href={`tel:${o.phone.replace(/s/g, "")}`} className="btn-secondary btn-sm"><Phone className="size-3.5" /> Appeler</a> : <span />}
                  <a href={`mailto:${o.email}`} className="btn-secondary btn-sm"><Mail className="size-3.5" /> E-mail</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full)}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm"><Navigation className="size-3.5" /> Itinéraire</a>
                </div>
              </section>
            );
          })()}
          <section className="card space-y-4 p-5">
            <h2 className="font-display font-semibold">Tarif & organisation</h2>
            <Segmented<"FLAT" | "HOURLY">
              value={isHourly(f) ? "HOURLY" : "FLAT"}
              onChange={(v) => setF((x) => (x ? { ...x, pricingMode: v, hourlyRate: x.hourlyRate || settings.defaultHourlyRate } : x))}
              options={[{ value: "FLAT", label: "Forfait par passage" }, { value: "HOURLY", label: "À l'heure" }]}
            />
            {isHourly(f) ? (
              <Field label="Tarif horaire (HTVA)">
                <div className="relative">
                  <input type="number" min={0} step="0.5" className="input pr-14" value={(f.hourlyRate ?? 0) / 100} onChange={(e) => set("hourlyRate", Math.round(+e.target.value * 100))} />
                  <span className="muted absolute right-3 top-1/2 -translate-y-1/2 text-sm">€/h</span>
                </div>
              </Field>
            ) : (
              <Field label="Prix d'un passage (HTVA)">
                <div className="relative">
                  <input type="number" min={0} step="0.01" className="input pr-10" value={f.price / 100} onChange={(e) => set("price", Math.round(+e.target.value * 100))} />
                  <span className="muted absolute right-3 top-1/2 -translate-y-1/2 text-sm">€</span>
                </div>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heure habituelle"><input type="time" className="input" value={f.defaultTime ?? ""} onChange={(e) => set("defaultTime", e.target.value)} /></Field>
              <Field label={isHourly(f) ? "Durée estimée" : "Durée (min)"}>
                {isHourly(f) ? (
                  <select className="input" value={f.durationMin} onChange={(e) => set("durationMin", +e.target.value)}>
                    {Array.from({ length: 32 }, (_, i) => (i + 1) * 30).map((m) => <option key={m} value={m}>{durationLabel(m)}</option>)}
                  </select>
                ) : (
                  <input type="number" min={15} step={15} className="input" value={f.durationMin} onChange={(e) => set("durationMin", +e.target.value)} />
                )}
              </Field>
            </div>
            <p className="muted -mt-1 rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-white/5">
              {isHourly(f)
                ? <>Passage estimé à <strong className="text-zinc-800 dark:text-zinc-200">{euros(giteUnitPrice(f))} HTVA</strong> ({durationLabel(f.durationMin)} × {euros(f.hourlyRate ?? 0)}). La durée réelle est demandée quand vous marquez le passage comme effectué.</>
                : <>Prix d&apos;un passage : <strong className="text-zinc-800 dark:text-zinc-200">{euros(f.price)} HTVA</strong>.</>}
            </p>
            <div>
              <span className="label">Couleur dans le calendrier</span>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set("color", c)} className={`size-8 rounded-full transition ${f.color === c ? "scale-110 ring-2 ring-zinc-900 ring-offset-2 ring-offset-[var(--surface)] dark:ring-white" : ""}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Lieu actif" hint="Un lieu désactivé n'est plus relancé ni proposé au client." />
          </section>

          {id && (
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <h2 className="flex items-center gap-2 font-display font-semibold"><Repeat className="size-4 text-brand-600" /> Passages réguliers</h2>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setSeries("new")}><Plus className="size-3.5" /> Ajouter</button>
              </div>
              {recurrences.filter((r) => r.giteId === id).length === 0 ? (
                <p className="muted px-4 pb-4 text-sm">Aucun. Ajoutez une fréquence (chaque semaine, tous les 15 jours, chaque mois) : les passages seront créés automatiquement.</p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {recurrences.filter((r) => r.giteId === id).map((r) => (
                    <button key={r.id} type="button" onClick={() => setSeries(r)} className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.03] ${r.active ? "" : "opacity-60"}`}>
                      <p className="font-medium">{recurrenceLabel(r)}{r.time ? ` · ${r.time}` : ""}</p>
                      {(r.variants ?? []).length > 0 && <p className="muted text-xs">Alternance : {r.variants!.join(" / ")}</p>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {id && (
            <section className="card overflow-hidden">
              <h2 className="px-4 pb-2 pt-4 font-display font-semibold">Passages ({history.length})</h2>
              <div className="max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
                {history.length === 0 && <p className="muted px-4 pb-4 text-sm">Aucun passage.</p>}
                {history.slice(0, 50).map((m) => (
                  <div key={m.id} className={m.date < today ? "opacity-70" : ""}><MissionLine m={m} showOwner={false} onClick={() => setOpen(m)} /></div>
                ))}
              </div>
            </section>
          )}

          {id && (
            <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:underline">
              <Trash2 className="size-4" /> Supprimer ce lieu
            </button>
          )}
        </div>
      </div>
    </form>
      <MissionDialog mission={open} onClose={() => setOpen(null)} />
      {id && <NewMissionDialog open={adding} onClose={() => setAdding(false)} defaultGiteId={id} />}
      {id && <RecurrenceDialog open={!!series} recurrence={series === "new" ? null : series} defaultGiteId={id} onClose={() => setSeries(null)} />}
    </>
  );
}
