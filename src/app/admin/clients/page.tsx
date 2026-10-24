"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Mail, Phone, Home, Pencil, Trash2, ShieldCheck, Send } from "lucide-react";
import { useAdmin } from "@/components/admin-data";
import { Empty, Field, Modal, PageHeader, Segmented, Spinner, Toggle } from "@/components/ui";
import { toast } from "@/components/toaster";
import { deleteProfile, saveProfile, queueMail } from "@/lib/actions";
import { timeAgo } from "@/lib/format";
import type { Profile, Role } from "@/lib/types";

type Form = Omit<Profile, "id">;
const empty = (role: Role): Form => ({ role, name: "", email: "", company: "", phone: "", billingAddress: "", vatNumber: "", notifyEmail: true, notifySms: false, active: true });

export default function ClientsPage() {
  const { profiles, gites, missions, me } = useAdmin();
  const [tab, setTab] = useState<Role>("OWNER");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ form: Form; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () => profiles.filter((p) => p.role === tab && (!q || `${p.name} ${p.email} ${p.company ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [profiles, tab, q],
  );

  const save = async () => {
    if (!edit) return;
    const email = edit.form.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Adresse e-mail invalide", "error");
    if (edit.isNew && profiles.some((p) => p.id === email)) return toast("Cette adresse existe déjà", "error");
    setBusy(true);
    try {
      await saveProfile({ ...edit.form, email }, me.name, edit.isNew);
      toast(edit.isNew ? "Compte créé" : "Modifications enregistrées");
      setEdit(null);
    } catch (e) {
      console.error(e);
      toast("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  const invite = async (p: Profile) => {
    await queueMail(p.id, "invite", `Invitation envoyée à ${p.name}`, "INVITE");
    toast(`Invitation envoyée à ${p.email}`);
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  return (
    <>
      <PageHeader
        title="Clients & accès"
        subtitle="Chaque client se connecte avec son adresse e-mail et un code reçu par e-mail."
        actions={<button className="btn-primary" onClick={() => setEdit({ form: empty(tab), isNew: true })}><Plus className="size-4" /> {tab === "OWNER" ? "Nouveau client" : "Nouveau gestionnaire"}</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<Role> value={tab} onChange={setTab} options={[{ value: "OWNER", label: "Clients" }, { value: "ADMIN", label: "Gestionnaires" }]} />
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <Empty icon={Users} title={tab === "OWNER" ? "Aucun client" : "Aucun gestionnaire"} text="Ajoutez une personne avec son adresse e-mail : elle pourra se connecter immédiatement." />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {list.map((p) => {
              const owned = gites.filter((g) => g.ownerEmail === p.id);
              const count = missions.filter((m) => m.ownerEmail === p.id && m.status === "DONE").length;
              return (
                <div key={p.id} className={`flex flex-wrap items-center gap-4 px-4 py-4 ${p.active ? "" : "opacity-55"}`}>
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 font-display font-semibold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
                    {p.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      {p.name} {p.company && <span className="muted font-normal">· {p.company}</span>}
                      {p.role === "ADMIN" && <ShieldCheck className="size-4 text-brand-600" />}
                      {!p.active && <span className="badge bg-zinc-200 text-zinc-700">Désactivé</span>}
                    </p>
                    <p className="muted mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="size-3.5" />{p.email}</a>
                      {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="size-3.5" />{p.phone}</a>}
                    </p>
                    {p.role === "OWNER" && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        {owned.map((g) => (
                          <Link key={g.id} href={`/admin/lieux/fiche/?id=${g.id}`} className="badge bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300">
                            <span className="size-1.5 rounded-full" style={{ background: g.color }} /> {g.name}
                          </Link>
                        ))}
                        {owned.length === 0 && <span className="muted">Aucun lieu</span>}
                        <span className="muted">· {count} passage(s) effectué(s)</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="muted mr-2 hidden text-xs md:block">{p.lastLoginAt ? `Vu ${timeAgo(p.lastLoginAt)}` : "Jamais connecté"}</span>
                    {p.role === "OWNER" && <button className="btn-ghost btn-sm" onClick={() => invite(p)} title="Envoyer une invitation"><Send className="size-3.5" /> <span className="hidden sm:inline">Inviter</span></button>}
                    {p.role === "OWNER" && <Link href={`/admin/lieux/fiche/`} className="btn-ghost btn-sm" title="Ajouter un lieu"><Home className="size-3.5" /></Link>}
                    <button className="btn-ghost btn-sm" onClick={() => { const { id, ...rest } = p; void id; setEdit({ form: { ...empty(p.role), ...rest }, isNew: false }); }} aria-label="Modifier"><Pencil className="size-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.isNew ? (edit.form.role === "ADMIN" ? "Nouveau gestionnaire" : "Nouveau client") : edit?.form.name}
        footer={
          <>
            {edit && !edit.isNew && edit.form.email !== me.email && (
              <button
                className="btn-ghost mr-auto text-rose-600"
                onClick={async () => {
                  const p = profiles.find((x) => x.id === edit.form.email);
                  if (!p) return;
                  if (gites.some((g) => g.ownerEmail === p.id)) return toast("Ce client a encore des lieux : désactivez-le plutôt.", "error");
                  if (!confirm(`Supprimer le compte de ${p.name} ?`)) return;
                  await deleteProfile(p, me.name);
                  toast("Compte supprimé");
                  setEdit(null);
                }}
              >
                <Trash2 className="size-4" /> Supprimer
              </button>
            )}
            <button className="btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
            <button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner />} Enregistrer</button>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom et prénom"><input className="input" autoFocus value={edit.form.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Société (facultatif)"><input className="input" value={edit.form.company} onChange={(e) => set("company", e.target.value)} /></Field>
            </div>
            <Field label="Adresse e-mail" hint={edit.isNew ? "Sert d'identifiant de connexion." : "L'adresse sert d'identifiant et ne peut pas être modifiée."}>
              <input className="input" type="email" disabled={!edit.isNew} value={edit.form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Téléphone"><input className="input" type="tel" value={edit.form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+32 470 00 00 00" /></Field>
            {edit.form.role === "OWNER" && (
              <>
                <Field label="Adresse de facturation"><textarea className="input min-h-[70px]" value={edit.form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} /></Field>
                <Field label="N° de TVA (facultatif)"><input className="input" value={edit.form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BE0123.456.789" /></Field>
              </>
            )}
            <div className="space-y-3 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
              <Toggle checked={edit.form.notifyEmail} onChange={(v) => set("notifyEmail", v)} label="Notifications par e-mail" hint={edit.form.role === "ADMIN" ? "Nouvelles demandes des clients" : "Confirmations et rappels"} />
              <Toggle checked={edit.form.notifySms} onChange={(v) => set("notifySms", v)} label="Rappels par SMS" hint="Si un service SMS est configuré" />
              <Toggle checked={edit.form.active} onChange={(v) => set("active", v)} label="Compte actif" hint="Un compte désactivé ne peut plus se connecter." />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
