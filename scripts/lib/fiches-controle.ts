// Fiches de contrôle remplies dans la Pointeuse LPF (collection « fichesControle » de sa base).
// Une fiche validée part en PDF avec le mail « Nettoyage effectué » du soir : on remplit le PDF d'origine
// (scripts/fiches/A1.pdf, A2.pdf, B1.pdf, G1.pdf — les mêmes que la pointeuse) puis on aplatit ses champs.
// Même logique que modules/fiches-controle.js de la pointeuse.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFName, type PDFRef } from "pdf-lib";

export type FicheControle = {
  id?: string;
  chantierId: string;
  chantierName?: string;
  date: string; // AAAA-MM-JJ
  modele: "A1" | "A2" | "B1" | "G1";
  zone?: string;
  horsPrestation?: number[];
  responsableNom?: string;
  statut?: "a_remplir" | "en_cours" | "validee";
  reponses?: Record<string, "F" | "R" | "S">;
  observations?: string;
  personnePrevenue?: string;
  aCorrigerAvant?: string;
  heure?: string;
  envoyeeLe?: string;
};

export const FICHES_COLLECTION = "fichesControle";
const NB_POINTS = { A1: 15, A2: 15, B1: 14, G1: 15 } as const;
const OPTION_PDF = { F: "Fait", R: "A_revoir", S: "Sans_objet" } as const;

/** Identifiant de la fiche d'un chantier de la pointeuse pour un jour donné */
export const ficheId = (chantierId: string, date: string) => `${chantierId}_${date}`;
export const estValidee = (f: Partial<FicheControle> | undefined | null): f is FicheControle =>
  !!f && f.statut === "validee" && !!f.modele && f.modele in NB_POINTS;

const dateFr = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "");

export function nomFichierPdf(f: FicheControle) {
  const nom = String(f.chantierName || "chantier").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `Fiche_${f.modele}_${nom}_${f.date}.pdf`;
}

/** Réponses complètes : les lignes hors prestation sont « S.O. » d'office */
export function reponsesCompletes(f: FicheControle) {
  const out: Record<number, "F" | "R" | "S"> = {};
  for (let n = 1; n <= NB_POINTS[f.modele]; n++) {
    const v = (f.horsPrestation ?? []).includes(n) ? "S" : f.reponses?.[String(n)];
    if (v === "F" || v === "R" || v === "S") out[n] = v;
  }
  return out;
}

// Helvetica (encodage WinAnsi) : on retire ce qu'elle ne sait pas écrire (émojis…)
const WINANSI_EN_PLUS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function textePdf(value: unknown) {
  return String(value ?? "").normalize("NFC").replace(/\r\n?/g, "\n").split("").map((ch) => {
    const code = ch.charCodeAt(0);
    if (ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_EN_PLUS.includes(ch)) return ch;
    if (ch === "Ł" || ch === "ł") return ch === "Ł" ? "L" : "l";
    const sansAccent = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return /^[\x20-\x7e]$/.test(sansAccent) ? sansAccent : "";
  }).join("");
}

export function champsTexte(f: FicheControle): Record<string, string> {
  return {
    site: f.chantierName ?? "",
    zone: f.zone ?? "",
    date: dateFr(f.date),
    heure: f.heure ?? "",
    agent: f.responsableNom ?? "",
    observations: f.observations ?? "",
    responsable: f.personnePrevenue ?? "",
    echeance: dateFr(f.aCorrigerAvant),
  };
}

// Les scripts sont lancés depuis la racine du dépôt (npx tsx scripts/…)
export const modeleBytes = (modele: FicheControle["modele"]) => readFileSync(join(process.cwd(), "scripts", "fiches", `${modele}.pdf`));

/** PDF final (le modèle d'origine rempli, champs aplatis) */
export async function remplirPdf(f: FicheControle, modele: Uint8Array = modeleBytes(f.modele)): Promise<Uint8Array> {
  const doc = await PDFDocument.load(modele);
  const form = doc.getForm();
  for (const [nom, valeur] of Object.entries(champsTexte(f))) {
    const champ = form.getTextField(nom);
    if (nom === "observations") champ.enableMultiline();
    champ.setText(textePdf(valeur));
  }
  for (const [n, v] of Object.entries(reponsesCompletes(f))) {
    form.getRadioGroup(`point_${String(n).padStart(2, "0")}`).select(OPTION_PDF[v]);
  }
  form.flatten();
  // pdf-lib laisse dans la page des renvois vers les cases supprimées : on les retire (sinon PDF abîmé)
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const garder = annots.asArray().filter((ref) => doc.context.lookup(ref as PDFRef));
    if (garder.length) page.node.set(PDFName.of("Annots"), doc.context.obj(garder));
    else page.node.delete(PDFName.of("Annots"));
  }
  return doc.save();
}
