"use client";

import { useEffect, useState } from "react";
import { Plus, Home, Building2, MapPin, Pencil, X, Link2, Save, BedDouble, Bath, Users, Clock, Info } from "lucide-react";
import { useOwner } from "@/components/owner-data";
import { Empty, Field, Modal, Spinner } from "@/components/ui";
import { toast } from "@/components/toaster";
import { useParam } from "@/lib/hooks";
import { ownerCreateGite, ownerSaveGite, type OwnerGiteInput } from "@/lib/actions";
import { COLORS, KIND } from "@/lib/format";
import type { Gite } from "@/lib/types";

const blank: OwnerGiteInput = {
  name: "", kind: "GITE", address: "", postalCode: "", city: "", accessInfo: "", notes: "",
  bedrooms: 2, bathrooms: 1, capacity: 4, bedSets: 2, towelSets: 4, defaultTime: "11:00", icalFeeds: [],
};

export default function OwnerPlacesPage() {
  const { gites } = useOwner();
  const add = useParam("ajouter");
  const [edit, setEdit] = useState<{ gite: Gite | null } | null>(null);

  useEffect(() => {
    if (!add) return;
    setEdit({ gite: null });
    window.history.replaceState(null, "", window.location.pathname);
  }, [add]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Mes lieux</h1>
          <p className="muted text-sm">Vos gîtes, appartements ou bureaux à entretenir.</p>
        </div>
        <button className="btn-primary" onClick={() => setEdit({ gite: null })}><Plus className="size-4" /> Ajouter</button>
      </div>

      {gites.length === 0 ? (
        <div className="card">
          <Empty
            icon={Home}
            title="Ajoutez votre premier lieu"
            text="Indiquez l'adresse et quelques informations utiles : vous pourrez ensuite encoder vos dates de nettoyage."
            action={<button className="btn-primary btn-lg" onClick={() => setEdit({ gite: null })}><Plus className="size-5" /> Ajouter un lieu</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {gites.map((g) => (
            <button key={g.id} onClick={() => setEdit({ gite: g })} className="card flex w-full items-start gap-3 p-4 text-left transition active:scale-[0.99]">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: g.color }}>
                {g.kind === "BUREAU" ? <Building2 className="size-5" /> : <Home className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{g.name}</span>
                  {g.pendingReview && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">En vérification</span>}
                </span>
                <span className="muted flex items-center gap-1 truncate text-[13px]"><MapPin className="size-3.5 shrink-0" />{g.address}{g.city ? `, ${g.city}` : ""}</span>
                <span className="muted mt-1.5 flex flex-wrap gap-x-3 text-xs">
                  <span className="inline-flex items-center gap-1"><BedDouble className="size-3.5" />{g.bedrooms} ch.</span>
                  <span className="inline-flex items-center gap-1"><Bath className="size-3.5" />{g.bathrooms} sdb</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{g.capacity} pers.</span>
                  {g.icalFeeds?.length > 0 && <span>· {g.icalFeeds.map((f) => f.label).join(" + ")} synchronisé</span>}
                </span>
              </span>
              <Pencil className="mt-1 size-4 shrink-0 text-zinc-400" />
            </button>
          ))}
        </div>
      )}

      <p className="muted flex gap-2 text-xs"><Info className="mt-0.5 size-3.5 shrink-0" />Le tarif de chaque lieu est fixé par Les Petites Fées. Un nouveau lieu est vérifié par notre équipe avant votre premier passage.</p>

      {edit && <PlaceForm gite={edit.gite} onClose={() => setEdit(null)} />}
    </div>
  );
}

function PlaceForm({ gite, onClose }: { gite: Gite | null; onClose: () => void }) {
  const { me, gites, settings } = useOwner();
  const [f, setF] = useState<OwnerGiteInput>(() =>
    gite
      ? { name: gite.name, kind: gite.kind, address: gite.address, postalCode: gite.postalCode ?? "", city: gite.city ?? "", accessInfo: gite.accessInfo ?? "", notes: gite.notes ?? "", bedrooms: gite.bedrooms, bathrooms: gite.bathrooms, capacity: gite.capacity, bedSets: gite.bedSets, towelSets: gite.towelSets, defaultTime: gite.defaultTime ?? "", icalFeeds: gite.icalFeeds ?? [] }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof OwnerGiteInput>(k: K, v: OwnerGiteInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const num = (k: "bedrooms" | "bathrooms" | "capacity" | "bedSets" | "towelSets") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Math.max(0, Number(e.target.value) || 0));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2 || f.address.trim().length < 3) return toast("Indiquez au moins le nom et l'adresse du lieu.", "error");
    setBusy(true);
    const data = { ...f, name: f.name.trim(), address: f.address.trim(), icalFeeds: f.icalFeeds.filter((x) => x.url.trim()).map((x) => ({ label: x.label, url: x.url.trim() })) };
    try {
      if (gite) {
        await ownerSaveGite(gite.id, data);
        toast("Lieu mis à jour");
      } else {
        const used = new Set(gites.map((g) => g.color));
        await ownerCreateGite(me, data, settings, COLORS.find((c) => !used.has(c)) ?? COLORS[gites.length % COLORS.length]);
        toast("Lieu ajouté ✨ Vous pouvez encoder vos dates.");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast("Enregistrement impossible. Réessayez.", "error");
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={gite ? gite.name : "Nouveau lieu"}
      footer={<button form="place-form" className="btn-primary btn-lg w-full sm:w-auto" disabled={busy}>{busy ? <Spinner /> : <Save className="size-5" />} {gite ? "Enregistrer" : "Ajouter ce lieu"}</button>}
    >
      <form id="place-form" onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-[1fr_8.5rem] gap-3">
          <Field label="Nom du lieu"><input className="input" required autoFocus={!gite} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Gîte du Moulin" /></Field>
          <Field label="Type">
            <select className="input" value={f.kind} onChange={(e) => set("kind", e.target.value as Gite["kind"])}>
              {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Adresse"><input className="input" required autoComplete="street-address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Rue et numéro" /></Field>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <Field label="Code postal"><input className="input" inputMode="numeric" autoComplete="postal-code" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="6900" /></Field>
          <Field label="Localité"><input className="input" autoComplete="address-level2" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Marche-en-Famenne" /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Chambres"><input type="number" min={0} inputMode="numeric" className="input" value={f.bedrooms} onChange={num("bedrooms")} /></Field>
          <Field label="Salles de bain"><input type="number" min={0} inputMode="numeric" className="input" value={f.bathrooms} onChange={num("bathrooms")} /></Field>
          <Field label="Personnes"><input type="number" min={0} inputMode="numeric" className="input" value={f.capacity} onChange={num("capacity")} /></Field>
        </div>
        {f.kind !== "BUREAU" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lits à refaire"><input type="number" min={0} inputMode="numeric" className="input" value={f.bedSets} onChange={num("bedSets")} /></Field>
            <Field label="Jeux de serviettes"><input type="number" min={0} inputMode="numeric" className="input" value={f.towelSets} onChange={num("towelSets")} /></Field>
          </div>
        )}

        <Field label="Accès" hint="Code de la boîte à clés, alarme, parking… Visible uniquement par vous et notre équipe.">
          <textarea className="input" value={f.accessInfo} onChange={(e) => set("accessInfo", e.target.value)} placeholder="Boîte à clés à gauche de la porte — code 1234" />
        </Field>
        <Field label="Consignes particulières"><textarea className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Animaux, linge fourni, poubelles le mardi…" /></Field>
        <Field label="Heure de passage habituelle">
          <div className="relative"><Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input type="time" className="input pl-9" value={f.defaultTime ?? ""} onChange={(e) => set("defaultTime", e.target.value)} /></div>
        </Field>

        <div>
          <span className="label">Calendrier Airbnb / Booking (facultatif)</span>
          <p className="hint mb-2 !mt-0">Collez le lien d&apos;export iCal de votre annonce : chaque départ de voyageurs créera automatiquement un nettoyage.</p>
          <div className="space-y-2">
            {f.icalFeeds.map((x, i) => (
              <div key={i} className="flex gap-2">
                <select className="input w-28 shrink-0" value={x.label} onChange={(e) => set("icalFeeds", f.icalFeeds.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}>
                  {["Airbnb", "Booking", "Abritel", "Autre"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="relative min-w-0 flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input className="input pl-9" type="url" placeholder="https://…ics" value={x.url} onChange={(e) => set("icalFeeds", f.icalFeeds.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)))} />
                </div>
                <button type="button" className="btn-ghost size-11 shrink-0 px-0" onClick={() => set("icalFeeds", f.icalFeeds.filter((_, j) => j !== i))} aria-label="Retirer"><X className="size-4" /></button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={() => set("icalFeeds", [...f.icalFeeds, { label: "Airbnb", url: "" }])}><Plus className="size-3.5" /> Ajouter un calendrier</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
