// Envoi des e-mails (Gmail de l'entreprise via mot de passe d'application) + journal Firestore.
import nodemailer from "nodemailer";
import type { Firestore } from "firebase-admin/firestore";
import { DEFAULT_SETTINGS, type Settings } from "../../src/lib/types";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const transport = user && pass
  ? nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465, auth: { user, pass } })
  : null;

export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type EmailItem = { title: string; meta?: string };
export type EmailSection = { heading: string; tone?: "success" | "info" | "warning" | "danger" | "neutral"; items: EmailItem[] };

export type Email = {
  /** Aperçu affiché à côté de l'objet dans la boîte de réception */
  preheader?: string;
  title: string;
  intro: string;
  lines?: string[];
  sections?: EmailSection[];
  /** Tableau récapitulatif (libellé → valeur) */
  summary?: [string, string][];
  cta?: { label: string; url: string };
  after?: string[];
  audience?: "client" | "admin";
};

const TONES = {
  success: { bar: "#10b981", bg: "#ecfdf5", fg: "#065f46", icon: "✓" },
  info: { bar: "#0ea5e9", bg: "#f0f9ff", fg: "#075985", icon: "↻" },
  warning: { bar: "#f59e0b", bg: "#fffbeb", fg: "#92400e", icon: "!" },
  danger: { bar: "#f43f5e", bg: "#fff1f2", fg: "#9f1239", icon: "✕" },
  neutral: { bar: "#4a9aa8", bg: "#f4f9fa", fg: "#214c55", icon: "•" },
};

/** « des Petites Fées » / « de Dupont SRL » */
const deName = (name: string) => (/^les /i.test(name) ? `des ${name.slice(4)}` : `de ${name}`);

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Gabarit e-mail professionnel : mise en page en tableaux (Gmail, Outlook, Apple Mail),
 * largeur 600 px, responsive, couleurs de la marque, logo, signature et pied de page légal.
 */
export function render(e: Email, s: Settings = DEFAULT_SETTINGS) {
  const p = (t: string) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:24px;color:#3f3f46">${t}</p>`;

  const sections = (e.sections ?? [])
    .filter((x) => x.items.length)
    .map((sec) => {
      const t = TONES[sec.tone ?? "neutral"];
      const rows = sec.items
        .map(
          (it) => `<tr><td style="padding:12px 16px;border-top:1px solid #eef2f3">
            <div style="font-family:${FONT};font-size:15px;line-height:21px;font-weight:600;color:#18181b">${it.title}</div>
            ${it.meta ? `<div style="font-family:${FONT};font-size:13px;line-height:19px;color:#71717a;margin-top:2px">${it.meta}</div>` : ""}
          </td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:1px solid #e4ecee;border-radius:14px;border-collapse:separate;overflow:hidden">
        <tr><td style="background:${t.bg};border-left:4px solid ${t.bar};padding:10px 16px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:.02em;color:${t.fg}">
          <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:10px;background:${t.bar};color:#fff;font-size:12px;margin-right:8px">${t.icon}</span>${esc(sec.heading)}
        </td></tr>${rows}</table>`;
    })
    .join("");

  const summary = e.summary?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;background:#f4f9fa;border-radius:14px">
        ${e.summary
          .map(
            ([k, v], i) => `<tr><td style="padding:${i ? "8px" : "16px"} 18px ${i === e.summary!.length - 1 ? "16px" : "8px"};font-family:${FONT};font-size:14px;color:#71717a">${esc(k)}</td>
              <td align="right" style="padding:${i ? "8px" : "16px"} 18px ${i === e.summary!.length - 1 ? "16px" : "8px"};font-family:${FONT};font-size:14px;font-weight:600;color:#18181b">${v}</td></tr>`,
          )
          .join("")}
      </table>`
    : "";

  const cta = e.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr>
        <td style="border-radius:12px;background:#2f6873" bgcolor="#2f6873">
          <a href="${e.cta.url}" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px">${esc(e.cta.label)} &rarr;</a>
        </td></tr></table>
      <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:#a1a1aa">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="${e.cta.url}" style="color:#2f6873;word-break:break-all">${esc(e.cta.url)}</a></p>`
    : "";

  const legal = [s.legalForm, s.bceNumber ? `BCE ${s.bceNumber}` : "", s.vatNumber ? `TVA ${s.vatNumber}` : ""].filter(Boolean).join(" · ");
  const links =
    e.audience === "admin"
      ? `<a href="${APP_URL}/admin/" style="color:#4a9aa8;text-decoration:underline">Tableau de bord</a> &nbsp;·&nbsp; <a href="${APP_URL}/admin/parametres/" style="color:#4a9aa8;text-decoration:underline">Paramètres</a>`
      : `<a href="${APP_URL}/espace/" style="color:#4a9aa8;text-decoration:underline">Mon espace</a> &nbsp;·&nbsp; <a href="${APP_URL}/espace/compte/" style="color:#4a9aa8;text-decoration:underline">Gérer mes notifications</a> &nbsp;·&nbsp; <a href="${APP_URL}/legal/#confidentialite" style="color:#4a9aa8;text-decoration:underline">Confidentialité</a>`;
  const why =
    e.audience === "admin"
      ? "Notification envoyée aux gestionnaires de l'application de planning."
      : `Vous recevez cet e-mail car vous êtes client·e ${esc(deName(s.companyName))}.`;

  const html = `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(e.title)}</title>
<style>
  @media (max-width:620px){ .wrap{padding:12px 8px!important} .inner{padding:26px 22px!important} .h1{font-size:22px!important;line-height:29px!important} }
  a{color:#2f6873}
</style>
</head>
<body style="margin:0;padding:0;background:#eef4f5;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(e.preheader ?? e.title)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f5">
<tr><td align="center" class="wrap" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td align="center" bgcolor="#275963" style="background:#275963;background-image:linear-gradient(135deg,#2f6873,#214c55);border-radius:20px 20px 0 0;padding:26px 24px 22px">
      <a href="${APP_URL}/" style="text-decoration:none"><img src="${APP_URL}/logo.png" width="170" alt="${esc(s.companyName)} — Service de nettoyage" style="display:block;width:170px;max-width:60%;height:auto;border:0;color:#ffffff;font-family:${FONT};font-size:20px;font-weight:700"></a>
    </td></tr>
    <tr><td class="inner" bgcolor="#ffffff" style="background:#ffffff;padding:34px 36px 30px">
      <h1 class="h1" style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:31px;font-weight:700;color:#18181b">${esc(e.title)}</h1>
      ${p(e.intro)}${(e.lines ?? []).map(p).join("")}${summary}${sections}${cta}${e.after?.length ? `<div style="padding-top:14px">${e.after.map(p).join("")}</div>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid #eef2f3"><tr><td style="padding-top:20px;font-family:${FONT};font-size:14px;line-height:21px;color:#3f3f46">
        ${e.audience === "admin" ? "— Votre assistant de planning ✨" : `Bien à vous,<br><strong style="color:#18181b">L'équipe ${esc(deName(s.companyName))}</strong><br><span style="color:#71717a">${esc(s.companyPhone)} · <a href="mailto:${s.companyEmail}" style="color:#2f6873">${esc(s.companyEmail)}</a></span>`}
      </td></tr></table>
    </td></tr>
    <tr><td bgcolor="#f7fafb" style="background:#f7fafb;border-radius:0 0 20px 20px;border-top:1px solid #e8eff1;padding:20px 28px;text-align:center;font-family:${FONT};font-size:12px;line-height:19px;color:#8a9499">
      <strong style="color:#52606a">${esc(s.companyName)}</strong> · ${esc(s.companyAddress)}${legal ? `<br>${esc(legal)}` : ""}<br>
      <span style="display:inline-block;margin-top:8px">${links}</span><br>
      <span style="display:inline-block;margin-top:8px;color:#a3acb1">${why}</span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const strip = (t: string) => t.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
  const text = [
    strip(e.intro),
    ...(e.lines ?? []).map(strip),
    ...(e.summary ?? []).map(([k, v]) => `${k} : ${strip(v)}`),
    ...(e.sections ?? []).filter((x) => x.items.length).map((sec) => `${sec.heading}\n${sec.items.map((i) => `  • ${strip(i.title)}${i.meta ? ` — ${strip(i.meta)}` : ""}`).join("\n")}`),
    e.cta ? `${e.cta.label} : ${e.cta.url}` : "",
    ...(e.after ?? []).map(strip),
    e.audience === "admin" ? "" : `Bien à vous,\nL'équipe ${deName(s.companyName)}\n${s.companyPhone} · ${s.companyEmail}`,
    `—\n${s.companyName} · ${s.companyAddress}${legal ? `\n${legal}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}

/** Envoie un e-mail et l'inscrit dans le journal (collection « mail »). */
export async function send(db: Firestore, to: string, subject: string, e: Email, s: Settings, kind: string, logId?: string) {
  const { html, text } = render(e, s);
  let status = "SIMULATED";
  let error: string | null = null;
  if (transport) {
    try {
      await transport.sendMail({ from: `"${s.companyName}" <${user}>`, replyTo: s.companyEmail || user, to, subject, html, text });
      status = "SENT";
    } catch (err) {
      status = "FAILED";
      error = err instanceof Error ? err.message : String(err);
    }
  } else {
    console.log(`  ✉ [simulé] ${to} — ${subject}`);
  }
  const doc = { to, subject, text, kind, status, error, sentAt: new Date().toISOString() };
  if (logId) await db.collection("mail").doc(logId).update(doc);
  else await db.collection("mail").add({ ...doc, createdAt: new Date().toISOString() });
  return status;
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) return "SIMULATED";
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  return res.ok ? "SENT" : "FAILED";
}
