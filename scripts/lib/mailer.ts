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

export type Email = { title: string; intro: string; lines?: string[]; list?: string[]; cta?: { label: string; url: string } };

export function render(e: Email, s: Settings = DEFAULT_SETTINGS) {
  const p = (t: string) => `<p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6">${t}</p>`;
  const list = e.list?.length
    ? `<table role="presentation" width="100%" style="margin:8px 0 16px;border-collapse:collapse">${e.list.map((l) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #eef2f3;color:#18181b;font-size:15px">${l}</td></tr>`).join("")}</table>`
    : "";
  const cta = e.cta
    ? `<p style="margin:26px 0 8px"><a href="${e.cta.url}" style="display:inline-block;background:#2f6873;color:#fff;text-decoration:none;padding:14px 26px;border-radius:14px;font-weight:600;font-size:16px">${esc(e.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#eef7f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#275963;border-radius:20px 20px 0 0;padding:22px 30px;color:#fff;font-size:18px;font-weight:700">✨ ${esc(s.companyName)}</td></tr>
<tr><td style="background:#fff;border-radius:0 0 20px 20px;padding:30px">
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b">${esc(e.title)}</h1>
${p(e.intro)}${(e.lines ?? []).map(p).join("")}${list}${cta}
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px;line-height:1.6">${esc(s.companyName)} · ${esc(s.companyAddress)}<br>${esc(s.companyPhone)} · ${esc(s.companyEmail)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const strip = (t: string) => t.replace(/<[^>]+>/g, "");
  const text = [strip(e.intro), ...(e.lines ?? []).map(strip), ...(e.list ?? []).map((l) => `• ${strip(l)}`), e.cta ? `${e.cta.label} : ${e.cta.url}` : "", `— ${s.companyName} · ${s.companyPhone}`].filter(Boolean).join("\n\n");
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
