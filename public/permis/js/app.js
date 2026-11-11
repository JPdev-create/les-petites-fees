/* Permis BE — application d'entraînement à l'examen théorique (permis B).
 * Fonctionne entièrement en local (localStorage) ; avec un compte, tout est sauvegardé dans Firebase
 * et un prof IA (Firebase AI Logic) explique les questions et analyse les examens. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const nav = $("#tabbar");
  const KEY = "permisbe.v1";
  const DAY = 864e5;
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // jours, système de Leitner
  const MASTER_BOX = 3;
  const AI_DAILY = 60;
  const REGIONS = { W: "Wallonie", B: "Bruxelles", F: "Flandre" };
  const Q = window.QUESTIONS, TH = window.THEMES, L = window.LESSONS, SG = window.SIGNS, RB = window.RULEBOOK, GEN = window.GEN, TPR = window.TPR;
  const QBY = Object.fromEntries(Q.map((q) => [q.id, q]));
  const GEN_THEMES = { priorite: ["prio", "prio", "prio"], panneaux: ["sign", "signpick"], vitesse: ["speed", "brake"], conduite: ["react", "twosec"], permis: ["score"] };

  /* ================================================================== état */
  const defaults = () => ({ region: null, timer: 0, goal: 20, look: "auto", sound: true, genShare: 25, q: {}, signs: {}, gen: {}, conf: {}, exams: [], sessions: [], days: {}, hist: [], saved: null, ai: { day: "", n: 0 }, tpr: {}, badges: {}, daily: {}, updatedAt: 0 });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(defaults(), JSON.parse(raw)); } catch (e) { /* stockage indisponible */ }
    return defaults();
  }
  let pushTimer = null;
  function save(sync = true) {
    S.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* plein ou bloqué */ }
    if (sync && cloudUser()) { clearTimeout(pushTimer); pushTimer = setTimeout(pushState, 3000); }
  }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const now = () => Date.now();
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const plural = (n, w, p = w + "s") => `${n} ${n > 1 ? p : w}`;
  const dateFR = (t) => new Date(t).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
  const timeFR = (t) => new Date(t).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  const newId = (p) => p + now().toString(36) + Math.random().toString(36).slice(2, 6);

  const inRegion = (q) => !q.r || !S.region || q.r.includes(S.region);
  const pool = () => Q.filter(inRegion);

  function record(store, id, ok, guess) {
    const r = store[id] || { n: 0, ok: 0, ko: 0, box: 0, due: 0, last: 0 };
    r.n++; r.last = now();
    if (ok) { r.ok++; r.box = guess ? 1 : Math.min(5, r.box + 1); r.due = now() + INTERVALS[r.box] * DAY; }
    else { r.ko++; r.box = 0; r.due = now(); r.lastKo = now(); }
    store[id] = r;
  }
  function countAnswer(ok) {
    S.days[today()] = (S.days[today()] || 0) + 1;
    S.hist.push(ok ? 1 : 0);
    if (S.hist.length > 300) S.hist = S.hist.slice(-300);
  }
  function recordQ(q, ok, guess) {
    if (q.gen) {
      const g = S.gen[q.gen] || { ok: 0, ko: 0 };
      ok ? g.ok++ : g.ko++;
      S.gen[q.gen] = g;
      if (q.signKey) record(S.signs, q.signKey, ok, guess);
    } else record(S.q, q.id, ok, guess);
    countAnswer(ok);
  }

  function streak() {
    let n = 0; const d = new Date();
    if (!S.days[today(d)]) d.setDate(d.getDate() - 1);
    while (S.days[today(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  const dueIds = () => pool().filter((q) => S.q[q.id] && S.q[q.id].due <= now()).sort((a, b) => S.q[a.id].box - S.q[b.id].box).map((q) => q.id);
  const errorIds = () => pool().filter((q) => S.q[q.id] && S.q[q.id].ko > 0).sort((a, b) => (S.q[b.id].lastKo || 0) - (S.q[a.id].lastKo || 0)).map((q) => q.id);

  function themeStats(t) {
    const qs = pool().filter((q) => !t || q.t === t);
    let ok = 0, ko = 0, seen = 0, mastered = 0;
    qs.forEach((q) => { const r = S.q[q.id]; if (!r) return; seen++; ok += r.ok; ko += r.ko; if (r.box >= MASTER_BOX) mastered++; });
    return { total: qs.length, seen, mastered, acc: pct(ok, ok + ko), answers: ok + ko };
  }

  function readiness() {
    const st = themeStats();
    const recent = S.hist.slice(-100);
    const acc = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const cover = st.seen / st.total, mast = st.mastered / st.total;
    const ex = S.exams.slice(-3);
    const exam = ex.length ? ex.reduce((a, e) => a + Math.max(0, (e.score - 25) / 25), 0) / ex.length : acc * cover;
    const v = Math.round(100 * Math.min(1, 0.35 * acc * Math.sqrt(cover) + 0.3 * mast + 0.35 * exam));
    return { v, label: v < 35 ? "Débutant·e" : v < 60 ? "En progrès" : v < 82 ? "Presque prêt·e" : "Prêt·e pour l'examen" };
  }

  /* ---------- trophées ---------- */
  const totalAnswers = () => Object.values(S.days).reduce((a, n) => a + n, 0);
  const tprTotal = () => Object.values(S.tpr).reduce((a, r) => a + (r.best || 0), 0);
  const BADGES = [
    { id: "first", icon: "🚀", nom: "Premiers pas", d: "Répondre à 10 questions", ok: () => totalAnswers() >= 10 },
    { id: "q100", icon: "💯", nom: "Centurion", d: "Répondre à 100 questions", ok: () => totalAnswers() >= 100 },
    { id: "q500", icon: "🏋️", nom: "Assidu·e", d: "Répondre à 500 questions", ok: () => totalAnswers() >= 500 },
    { id: "q1000", icon: "🏅", nom: "Marathon", d: "Répondre à 1 000 questions", ok: () => totalAnswers() >= 1000 },
    { id: "streak3", icon: "🔥", nom: "Lancé·e", d: "S'entraîner 3 jours d'affilée", ok: () => streak() >= 3 },
    { id: "streak7", icon: "📆", nom: "Une semaine", d: "S'entraîner 7 jours d'affilée", ok: () => streak() >= 7 },
    { id: "exam1", icon: "📝", nom: "Premier examen", d: "Terminer un examen blanc", ok: () => S.exams.length >= 1 },
    { id: "pass1", icon: "🎓", nom: "Réussi !", d: "Réussir un examen blanc (41/50)", ok: () => S.exams.some((e) => e.pass) },
    { id: "pass3", icon: "🏆", nom: "Régulier·e", d: "Réussir 3 examens blancs d'affilée", ok: () => S.exams.length >= 3 && S.exams.slice(-3).every((e) => e.pass) },
    { id: "clean", icon: "💎", nom: "Zéro faute grave", d: "Réussir un examen sans faute grave", ok: () => S.exams.some((e) => e.pass && e.grave === 0) },
    { id: "s48", icon: "🌟", nom: "Presque parfait", d: "Obtenir 48/50 ou plus", ok: () => S.exams.some((e) => e.score >= 48) },
    { id: "m100", icon: "🧠", nom: "100 maîtrisées", d: "Maîtriser 100 questions", ok: () => themeStats().mastered >= 100 },
    { id: "mall", icon: "👑", nom: "Encyclopédie", d: "Maîtriser 90 % des questions", ok: () => { const t = themeStats(); return t.mastered >= 0.9 * t.total; } },
    { id: "signs", icon: "🛑", nom: "Expert·e panneaux", d: "Maîtriser 40 panneaux", ok: () => Object.values(S.signs).filter((r) => r.box >= MASTER_BOX).length >= 40 },
    { id: "prio", icon: "🔀", nom: "Roi du carrefour", d: "Réussir 30 carrefours générés", ok: () => (S.gen.prio || {}).ok >= 30 },
    { id: "tpr", icon: "👀", nom: "Œil de lynx", d: "40 points au total en perception des risques", ok: () => tprTotal() >= 40 },
    { id: "tpr5", icon: "⚡", nom: "Réflexe parfait", d: "Obtenir 5/5 à une scène de perception", ok: () => Object.values(S.tpr).some((r) => r.best >= 5) },
    { id: "daily", icon: "📅", nom: "Défi relevé", d: "Terminer un défi du jour", ok: () => Object.keys(S.daily).length >= 1 },
    { id: "daily7", icon: "🗓️", nom: "Défis en série", d: "Terminer 7 défis du jour", ok: () => Object.keys(S.daily).length >= 7 },
    { id: "ai", icon: "🤖", nom: "Curieux·se", d: "Poser une question au prof IA", ok: () => S.ai.n > 0 || !!S.badges.ai },
  ];
  function checkBadges() {
    const fresh = BADGES.filter((b) => !S.badges[b.id] && b.ok());
    fresh.forEach((b) => (S.badges[b.id] = now()));
    if (fresh.length) { save(); fresh.forEach((b, i) => setTimeout(() => toast(`${b.icon} Trophée débloqué : ${b.nom}`), 600 + i * 1400)); }
  }

  /* ---------- défi du jour : mêmes 10 questions pour tout le monde ce jour-là ---------- */
  function seeded(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function dailyIds() {
    const rnd = seeded("permis-" + today());
    const p = pool().slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    return p.slice(0, 10).map((q) => q.id);
  }

  function insights() {
    const out = [];
    const ts = Object.keys(TH).map((t) => ({ t, ...themeStats(t) })).filter((x) => x.answers >= 6).sort((a, b) => a.acc - b.acc);
    if (ts.length && ts[0].acc < 80) out.push({ icon: "🎯", txt: `Ton point faible : <b>${TH[ts[0].t].nom}</b> (${ts[0].acc} % de bonnes réponses).`, act: `train:${ts[0].t}`, cta: "Travailler ce thème" });
    const pr = S.gen.prio;
    if (pr && pr.ok + pr.ko >= 6 && pct(pr.ok, pr.ok + pr.ko) < 75) out.push({ icon: "🔀", txt: `Carrefours générés : <b>${pct(pr.ok, pr.ok + pr.ko)} %</b> de réussite. Entraîne-toi sur des situations toujours nouvelles.`, act: "gen:prio", cta: "10 carrefours" });
    const graveKo = pool().filter((q) => q.g && S.q[q.id] && S.q[q.id].box === 0 && S.q[q.id].ko > 0).length;
    if (graveKo) out.push({ icon: "⚠️", txt: `<b>${graveKo}</b> question${graveKo > 1 ? "s" : ""} à faute grave ratée${graveKo > 1 ? "s" : ""} et pas encore corrigée${graveKo > 1 ? "s" : ""}. Chacune coûte 5 points à l'examen.`, act: "graves", cta: "Les revoir" });
    const conf = Object.entries(S.conf).sort((a, b) => b[1] - a[1])[0];
    if (conf && conf[1] >= 2) {
      const [a, b] = conf[0].split(">");
      if (SG[a] && SG[b]) out.push({ icon: "🔁", txt: `Tu confonds souvent <b>${esc(SG[a].nom)}</b> et <b>${esc(SG[b].nom)}</b>.`, html: `<div class="pair">${signTile(a)}${signTile(b)}</div>` });
    }
    const last = S.exams[S.exams.length - 1];
    if (last && !last.pass && last.grave >= 2) out.push({ icon: "💡", txt: `Ton dernier examen blanc a été raté à cause de <b>${last.grave} fautes graves</b>. Vise d'abord zéro faute grave.`, act: `go:#/detail/${last.id}`, cta: "Voir le détail" });
    return out;
  }

  /* ================================================================== nuage */
  const cloudUser = () => (window.Cloud && window.Cloud.user) || null;
  let syncState = "off"; // off | syncing | ok | error
  const stateForCloud = () => { const { saved, exams, sessions, ...rest } = S; return rest; };

  async function pushState() {
    if (!cloudUser()) return;
    try { syncState = "syncing"; await window.Cloud.saveState(stateForCloud()); syncState = "ok"; }
    catch (e) { syncState = "error"; console.warn(e); }
    updateSyncBadge();
  }

  const better = (a, b) => (!a ? b : !b ? a : (b.n || 0) > (a.n || 0) || ((b.n || 0) === (a.n || 0) && (b.last || 0) > (a.last || 0)) ? b : a);
  function mergeInto(remote, exams, sessions) {
    if (remote) {
      ["q", "signs"].forEach((k) => { const m = { ...(S[k] || {}) }; Object.entries(remote[k] || {}).forEach(([id, r]) => (m[id] = better(m[id], r))); S[k] = m; });
      Object.entries(remote.gen || {}).forEach(([k, g]) => { const l = S.gen[k]; if (!l || g.ok + g.ko > l.ok + l.ko) S.gen[k] = g; });
      Object.entries(remote.conf || {}).forEach(([k, v]) => (S.conf[k] = Math.max(S.conf[k] || 0, v)));
      Object.entries(remote.days || {}).forEach(([k, v]) => (S.days[k] = Math.max(S.days[k] || 0, v)));
      Object.entries(remote.tpr || {}).forEach(([k, v]) => { const l = S.tpr[k]; S.tpr[k] = !l ? v : { best: Math.max(l.best, v.best), n: Math.max(l.n, v.n), last: Math.max(l.last || 0, v.last || 0) }; });
      Object.entries(remote.badges || {}).forEach(([k, v]) => { if (!S.badges[k] || v < S.badges[k]) S.badges[k] = v; });
      Object.entries(remote.daily || {}).forEach(([k, v]) => { if (S.daily[k] == null || v > S.daily[k]) S.daily[k] = v; });
      if ((remote.hist || []).length > S.hist.length) S.hist = remote.hist;
      if ((remote.updatedAt || 0) > (S.updatedAt || 0)) ["region", "timer", "goal", "look", "sound", "genShare"].forEach((k) => { if (remote[k] != null) S[k] = remote[k]; });
      if (!S.region && remote.region) S.region = remote.region;
    }
    const union = (a, b) => { const m = new Map(); [...a, ...b].forEach((x) => x && x.id && m.set(x.id, { ...(m.get(x.id) || {}), ...x })); return [...m.values()].sort((x, y) => x.d - y.d); };
    S.exams = union(S.exams, exams || []).slice(-100);
    S.sessions = union(S.sessions, sessions || []).slice(-150);
  }

  async function syncDown() {
    if (!cloudUser()) return;
    try {
      syncState = "syncing"; updateSyncBadge();
      const [remote, exams, sessions] = await Promise.all([window.Cloud.loadState(), window.Cloud.listItems("exams", 100), window.Cloud.listItems("sessions", 150)]);
      const localExams = S.exams.slice(), localSessions = S.sessions.slice();
      mergeInto(remote, exams, sessions);
      save(false);
      // envoie ce qui n'existait qu'en local
      const remoteIds = new Set([...exams, ...sessions].map((x) => x.id));
      for (const e of localExams) if (!remoteIds.has(e.id)) await window.Cloud.saveItem("exams", e);
      for (const s of localSessions) if (!remoteIds.has(s.id)) await window.Cloud.saveItem("sessions", s);
      await window.Cloud.saveState(stateForCloud());
      syncState = "ok";
    } catch (e) { syncState = "error"; console.warn(e); }
    updateSyncBadge();
    if (location.hash !== "#/play") render();
  }

  function updateSyncBadge() {
    const el = $("#sync-badge");
    if (!el) return;
    el.textContent = syncState === "syncing" ? "⏳" : syncState === "error" ? "⚠️" : cloudUser() ? "☁️" : "👤";
    el.title = syncState === "error" ? "Synchronisation impossible (hors ligne ?)" : cloudUser() ? "Progression sauvegardée dans ton compte" : "Créer un compte pour tout sauvegarder";
  }

  function onCloudReady() {
    window.Cloud.onUser((u) => {
      syncState = u ? "syncing" : "off";
      updateSyncBadge();
      if (u) syncDown();
      else if (["#/compte"].includes(location.hash)) render();
    });
  }
  if (window.Cloud) onCloudReady(); else window.addEventListener("cloud-ready", onCloudReady, { once: true });

  /* ================================================================== sons, confettis */
  let actx;
  function beep(ok) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination); o.type = "sine";
      const t = actx.currentTime;
      o.frequency.setValueAtTime(ok ? 660 : 220, t);
      if (ok) o.frequency.setValueAtTime(880, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.22 : 0.3));
      o.start(t); o.stop(t + 0.32);
    } catch (e) { /* pas de son */ }
    if (!ok && navigator.vibrate) navigator.vibrate(60);
  }
  function confetti() {
    const box = document.createElement("div");
    box.className = "confetti";
    const cols = ["#f6c700", "#c8102e", "#111", "#3c8dde", "#26a269"];
    for (let i = 0; i < 90; i++) { const p = document.createElement("i"); p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * 0.6 + "s"; box.appendChild(p); }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }

  /* ================================================================== composants */
  const signTile = (k) => `<button class="sign-tile" data-act="sign:${k}" aria-label="${esc(SG[k].nom)}">${SG[k].svg()}<span>${esc(SG[k].code)}</span></button>`;
  const bar = (v, cls = "") => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
  const ring = (v, label, sub) => { const r = 52, c = 2 * Math.PI * r; return `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="ring-bg"/><circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg><div class="ring-txt"><b>${v}<small>%</small></b><span>${label}</span>${sub ? `<em>${sub}</em>` : ""}</div></div>`; };
  const media = (q) => (q.sc ? `<div class="media scene-wrap">${window.sceneSVG(q.sc)}</div>` : q.s && SG[q.s] ? `<div class="media sign-wrap">${SG[q.s].svg()}</div>` : "");
  const optImgs = (q) => q.oh || (q.keys ? q.keys.map((k) => (SG[k] ? SG[k].svg() : "")) : null);
  const optLabel = (q, oi) => (oi == null ? "<i>pas de réponse (temps écoulé)</i>" : esc(q.o[oi]));
  const snap = (q) => { const { oh, ...rest } = q; return rest; }; // copie d'une question générée (sans les SVG lourds)
  const qOf = (x) => x.snap || x.q || QBY[x.id];

  function enhance(root = app) {
    root.querySelectorAll(".signrow[data-signs]").forEach((el) => { el.innerHTML = el.dataset.signs.split(",").filter((k) => SG[k]).map(signTile).join(""); });
  }

  // Mini-Markdown sûr pour les réponses de l'IA
  function md(t) {
    const lines = esc(t).split(/\n/);
    let html = "", inList = false;
    for (const raw of lines) {
      const l = raw.trim();
      const li = l.match(/^[-*•]\s+(.*)/) || l.match(/^\d+[.)]\s+(.*)/);
      if (li) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (!l) continue;
      const h = l.match(/^#{1,4}\s+(.*)/);
      html += h ? `<p><b>${inline(h[1])}</b></p>` : `<p>${inline(l)}</p>`;
    }
    return html + (inList ? "</ul>" : "");
    function inline(s) { return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g, "$1<i>$2</i>"); }
  }

  /* ================================================================== routeur */
  let timerId = null;
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  window.addEventListener("hashchange", render);

  let tprStop = null;
  function render() {
    clearInterval(timerId);
    if (tprStop) { tprStop(); tprStop = null; }
    const parts = location.hash.split("/");
    const route = parts[1] || "", arg = decodeURIComponent(parts.slice(2).join("/") || "");
    const views = { "": vHome, train: vTrain, play: vPlay, result: vResult, exam: vExamIntro, regles: vRules, fiche: vLesson, signs: vSigns, stats: vStats, errors: vErrors, settings: vSettings, historique: vHistory, detail: vDetail, compte: vAccount, tpr: vTpr, trophees: vBadges };
    if (!S.region && !["settings", "compte"].includes(route)) { document.body.dataset.route = "onboard"; app.innerHTML = vOnboard(); return; }
    document.body.dataset.route = route || "home";
    (views[route] || vHome)(arg);
    const tabOf = { fiche: "regles", detail: "stats", historique: "stats", errors: "train", tpr: "train", trophees: "stats" };
    const cur = tabOf[route] || route;
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#/${cur}` || (cur === "" && a.getAttribute("href") === "#/")));
    if (!(route === "play" && SES && SES.state === "done")) window.scrollTo(0, 0);
    if (route !== "play") checkBadges();
    enhance();
    updateSyncBadge();
  }

  /* ================================================================== accueil */
  function vOnboard() {
    return `<section class="onboard">
      <div class="logo-big">🚗<span>🇧🇪</span></div>
      <h1>Permis B — théorie</h1>
      <p class="lead">${Q.length} questions expliquées + des situations générées à l'infini, examens blancs au vrai barème, livre des règles complet, prof IA. À jour avec les règles de novembre 2026.</p>
      <h2>Où passes-tu ton examen ?</h2>
      <p class="muted">Certaines règles changent selon la Région (vitesse hors agglomération, Bruxelles en zone 30, test de perception des risques en Wallonie…).</p>
      <div class="region-pick">${Object.entries(REGIONS).map(([k, v]) => `<button class="btn big" data-act="region:${k}">${v}</button>`).join("")}</div>
      <p class="tiny muted">Tu as déjà un compte ? <a href="#/compte">Connecte-toi</a> pour retrouver ta progression.</p>
    </section>`;
  }

  function vHome() {
    const rd = readiness(), st = themeStats(), due = dueIds().length, sk = streak();
    const done = S.days[today()] || 0;
    const ins = insights();
    const lastEx = S.exams.slice(-1)[0];
    const u = cloudUser();
    const sv = S.saved;
    app.innerHTML = `
    <header class="hero">
      <div class="hero-top"><div><p class="muted tiny">Permis B · ${REGIONS[S.region]}</p><h1>${u && u.displayName ? `Salut ${esc(u.displayName.split(" ")[0])} 👋` : "Salut 👋"}</h1></div>
        <div class="chips"><span class="chip ${sk ? "fire" : ""}" title="Jours d'affilée">🔥 ${sk} j</span><a class="chip" href="#/compte" id="sync-badge" aria-label="Compte">👤</a><a class="chip" href="#/settings" aria-label="Réglages">⚙️</a></div></div>
      <div class="hero-main">${ring(rd.v, rd.label, "préparation")}
        <div class="hero-side">
          <div class="kpi"><b>${st.mastered}</b><span>/ ${st.total} maîtrisées</span></div>
          <div class="kpi"><b>${st.seen ? st.acc + " %" : "—"}</b><span>bonnes réponses</span></div>
          <div class="kpi"><b>${lastEx ? lastEx.score + "/50" : "—"}</b><span>dernier examen</span></div>
        </div></div>
      <div class="goal"><div class="goal-lbl"><span>Objectif du jour</span><b>${Math.min(done, S.goal)}/${S.goal}</b></div>${bar(pct(done, S.goal), done >= S.goal ? "ok" : "")}</div>
    </header>
    ${sv ? `<button class="resume-card" data-act="resume"><span class="ai">⏯️</span><span><b>Reprendre : ${esc(sv.title)}</b><small>Question ${sv.i + 1}/${sv.items.length} · commencée à ${timeFR(sv.start)}</small></span><span class="x" data-act="drop" title="Abandonner">✕</span></button>` : ""}
    ${!u ? `<a class="account-nudge" href="#/compte">☁️ <span><b>Crée ton compte gratuit</b> : tes sessions, examens et erreurs sauvegardés sur tous tes appareils + le prof IA.</span></a>` : ""}
    ${dailyCard()}
    <div class="actions">
      <button class="action primary" data-act="mix"><span class="ai">✨</span><span><b>Continuer</b><small>Mix intelligent : erreurs à revoir, nouvelles questions, situations générées</small></span></button>
      <button class="action" data-act="go:#/exam"><span class="ai">📝</span><span><b>Examen blanc</b><small>50 questions, barème officiel (−1 / −5), correction détaillée</small></span></button>
      <button class="action ${due ? "warn" : ""}" data-act="review"><span class="ai">🔁</span><span><b>Révision</b><small>${due ? `${plural(due, "question")} à revoir maintenant` : "Rien à revoir pour l'instant 👌"}</small></span></button>
      <button class="action" data-act="go:#/tpr"><span class="ai">👀</span><span><b>Perception des risques</b><small>${TPR.SCENES.length} scènes animées, comme le TPR · ${tprTotal()}/${TPR.SCENES.length * 5} points</small></span></button>
    </div>
    ${ins.length ? `<section><h2>Ton coach</h2>${ins.map((i) => `<div class="insight"><span class="ii">${i.icon}</span><div><p>${i.txt}</p>${i.html || ""}${i.act ? `<button class="link" data-act="${i.act}">${i.cta} →</button>` : ""}</div></div>`).join("")}</section>` : ""}
    <section><div class="sec-h"><h2>Par thème</h2><a href="#/train" class="link">Tout voir</a></div>
      <div class="themes">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; return `<button class="theme" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="tn">${t.nom}</span>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total}${s.answers ? ` · ${s.acc} %` : ""}</small></button>`; }).join("")}</div>
    </section>
    <section class="news">
      <a href="#/regles" class="news-card"><b>📚 Livre des règles</b><span>${RB.length} chapitres, toute la matière, avec recherche</span></a>
      <a href="#/fiche/nouveautes" class="news-card"><b>🆕 Nouveautés 2026</b><span>Amendes +10 %, retrait de 12 h pour l'alcool…</span></a>
    </section>`;
  }

  function dailyCard() {
    const done = S.daily[today()];
    let days = 0; const d = new Date();
    while (S.daily[today(d)] != null) { days++; d.setDate(d.getDate() - 1); }
    return `<button class="daily ${done != null ? "done" : ""}" data-act="daily"><span class="ai">📅</span><span><b>Défi du jour</b><small>${done != null ? `Fait : ${done}/10 aujourd'hui · le refaire` : "10 questions, les mêmes pour tout le monde aujourd'hui"}${days > 1 ? ` · ${days} jours de suite` : ""}</small></span><span class="go">${done != null ? "✓" : "→"}</span></button>`;
  }

  function vTrain() {
    const st = themeStats();
    const unseen = pool().filter((q) => !S.q[q.id]).length;
    const graves = pool().filter((q) => q.g).length;
    const errs = errorIds().length;
    app.innerHTML = `<h1 class="page-h">S'entraîner</h1>
    <div class="actions">
      <button class="action primary" data-act="mix"><span class="ai">✨</span><span><b>Mix intelligent · 20</b><small>L'appli choisit pour toi, sans répéter ce que tu viens de voir</small></span></button>
      <button class="action" data-act="quick"><span class="ai">⚡</span><span><b>Session éclair · 10</b><small>5 minutes chrono</small></span></button>
      <button class="action" data-act="unseen"><span class="ai">🆕</span><span><b>Jamais vues</b><small>${plural(unseen, "question")} restante${unseen > 1 ? "s" : ""}</small></span></button>
      <button class="action" data-act="graves"><span class="ai">⚠️</span><span><b>Fautes graves</b><small>Les ${graves} questions qui coûtent 5 points</small></span></button>
      <button class="action" data-act="go:#/errors"><span class="ai">📓</span><span><b>Carnet d'erreurs</b><small>${plural(errs, "question")} déjà ratée${errs > 1 ? "s" : ""}</small></span></button>
    </div>
    <a class="action" href="#/tpr" style="margin-top:10px;text-decoration:none;color:inherit"><span class="ai">👀</span><span><b>Perception des risques</b><small>Scènes animées : touche « Danger » au bon moment (comme le TPR wallon)</small></span></a>
    <h2>Situations générées <small class="muted">· toujours nouvelles</small></h2>
    <div class="gen-grid">${Object.entries(GEN.KINDS).map(([k, g]) => { const s = S.gen[k]; return `<button class="gen-card" data-act="gen:${k}"><b>${g.nom}</b><small>${s ? `${pct(s.ok, s.ok + s.ko)} % · ${s.ok + s.ko} faites` : "Pas encore essayé"}</small></button>`; }).join("")}</div>
    <h2>Par thème <small class="muted">· ${st.mastered}/${st.total} maîtrisées</small></h2>
    <div class="list">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; const ch = RB.find((c) => c.theme === k); return `<div class="row"><button class="row-main" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="grow"><b>${t.nom}</b>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total} maîtrisées${s.answers ? ` · ${s.acc} % de réussite` : ""}</small></span></button>${ch ? `<a class="row-side" href="#/regles/${ch.id}" title="Livre des règles">📖</a>` : ""}</div>`; }).join("")}</div>`;
  }

  function vExamIntro() {
    const ex = S.exams.slice(-6).reverse();
    app.innerHTML = `<h1 class="page-h">Examen blanc</h1>
    <div class="card exam-rules">
      <div class="rules-grid"><div><b>50</b><span>questions</span></div><div><b>41</b><span>pour réussir</span></div><div><b>−1</b><span>erreur</span></div><div><b>−5</b><span>faute grave</span></div></div>
      <ul><li>Comme le vrai : pas de correction pendant l'épreuve, pas de retour en arrière.</li><li><b>2 fautes graves = échec</b>, quel que soit le reste.</li><li>Chaque examen est différent : priorité aux questions que tu n'as pas vues récemment + situations générées.</li><li>Correction complète des 50 questions, temps de réponse, analyse par thème${cloudUser() ? " et bilan du prof IA" : ""}.</li></ul>
      <div class="field"><span>Chrono par question</span><div class="seg">${[[0, "Sans"], [30, "30 s"], [15, "15 s"]].map(([v, l]) => `<button class="${S.timer === v ? "on" : ""}" data-act="timer:${v}">${l}</button>`).join("")}</div></div>
      <button class="btn primary big full" data-act="startexam">Commencer l'examen</button>
    </div>
    ${ex.length ? `<div class="sec-h"><h2>Derniers examens</h2><a class="link" href="#/historique">Historique</a></div><div class="list">${ex.map(examRow).join("")}</div>` : ""}`;
  }
  const examRow = (e) => `<a class="row" href="#/detail/${e.id}"><span class="badge ${e.pass ? "ok" : "ko"}">${e.pass ? "Réussi" : "Raté"}</span><span class="grow"><b>${e.score}/50</b> <small class="muted">· ${plural(e.grave, "faute grave", "fautes graves")} · ${plural(e.light, "erreur")}</small></span><small class="muted">${dateFR(e.d)}</small></a>`;

  /* ================================================================== sessions */
  let SES = null;
  const permFor = (q) => (q.fix ? q.o.map((_, i) => i) : shuffle(q.o.map((_, i) => i)));
  const mkItem = (x) => (typeof x === "string" ? { id: x, perm: permFor(QBY[x]) } : { id: x.id, q: x, perm: permFor(x) });

  function persistSes() {
    if (!SES || SES.mode === "signs") return;
    S.saved = { ...SES, retried: [...SES.retried] };
    save(false);
  }
  function startSession(mode, list, title) {
    list = list.filter(Boolean);
    if (!list.length) { toast("Rien à réviser ici pour l'instant 👍"); return; }
    SES = { id: newId(mode === "exam" ? "e" : "s"), mode, title, items: list.map(mkItem), i: 0, log: [], start: now(), retried: new Set(), state: "ask", sel: null, guess: false, shownAt: now() };
    persistSes();
    go("#/play");
  }
  function resume() {
    if (!S.saved) return;
    const wasDone = S.saved.state === "done";
    SES = { ...S.saved, retried: new Set(S.saved.retried || []), state: "ask", sel: null, guess: false, shownAt: now() };
    if (wasDone) { if (SES.i + 1 < SES.items.length) SES.i++; else { finish(); return; } }
    go("#/play");
  }

  function startSigns(keys) {
    const all = Object.keys(SG);
    const items = keys.map((k) => {
      const same = shuffle(all.filter((x) => x !== k && SG[x].cat === SG[k].cat && SG[x].nom !== SG[k].nom));
      const other = shuffle(all.filter((x) => x !== k && SG[x].cat !== SG[k].cat));
      return { id: k, opts: shuffle([k, ...same.slice(0, 2), ...other].slice(0, 4)) };
    });
    SES = { id: newId("s"), mode: "signs", title: "Quiz panneaux", items, i: 0, log: [], start: now(), retried: new Set(), state: "ask" };
    go("#/play");
  }

  // Combien de temps depuis la dernière fois qu'on a vu la question (en heures)
  const ageH = (id) => { const r = S.q[id]; return r ? (now() - r.last) / 36e5 : 1e6; };

  function pickMix(n) {
    const nGen = Math.round((n * S.genShare) / 100);
    const scored = pool().map((q) => {
      const r = S.q[q.id];
      let s;
      if (!r) s = 50;
      else if (r.due <= now()) s = 100 + (5 - r.box) * 12 + (r.ko > r.ok ? 20 : 0);
      else s = 5 + (r.ko > r.ok ? 25 : 0) + (5 - r.box) * 3;
      if (q.g) s += 6;
      if (r && ageH(q.id) < 12 && r.due > now()) s -= 60; // vue il y a moins de 12 h : on évite
      return { id: q.id, s: s + Math.random() * 25 };
    }).sort((a, b) => b.s - a.s);
    return shuffle([...scored.slice(0, n - nGen).map((x) => x.id), ...GEN.batch(nGen, null, S.region)]);
  }

  function buildExam() {
    const recent = new Set(S.exams.slice(-3).flatMap((e) => (e.items || []).map((i) => i.id)));
    // tri : jamais vues / vues il y a longtemps d'abord, hors examens récents, avec une part d'aléatoire
    const p = pool().map((q) => ({ q, s: Math.min(ageH(q.id), 24 * 30) + (recent.has(q.id) ? -2000 : 0) + Math.random() * 200 })).sort((a, b) => b.s - a.s).map((x) => x.q);
    const nGen = 8;
    const generated = [GEN.make("prio", S.region), GEN.make("prio", S.region), GEN.make("prio", S.region), GEN.make("signpick"), GEN.make("sign"), GEN.make("speed", S.region), GEN.make(Math.random() < 0.5 ? "react" : "twosec"), GEN.make("brake")];
    const want = 50 - nGen;
    const graves = p.filter((q) => q.g).slice(0, 12);
    const perTheme = {};
    graves.forEach((q) => (perTheme[q.t] = (perTheme[q.t] || 0) + 1));
    const rest = [];
    for (const q of p) {
      if (graves.length + rest.length >= want) break;
      if (q.g || (perTheme[q.t] || 0) >= 6) continue;
      perTheme[q.t] = (perTheme[q.t] || 0) + 1;
      rest.push(q);
    }
    for (const q of p) { if (graves.length + rest.length >= want) break; if (!graves.includes(q) && !rest.includes(q)) rest.push(q); }
    return shuffle([...graves.map((q) => q.id), ...rest.map((q) => q.id), ...generated]);
  }

  function vPlay() {
    if (!SES) { go("#/"); return; }
    if (SES.mode === "signs") return vPlaySign();
    const it = SES.items[SES.i];
    const q = qOf(it);
    const exam = SES.mode === "exam";
    const answered = SES.state === "done";
    const total = SES.items.length;
    const imgs = optImgs(q);
    const opts = it.perm.map((oi, k) => {
      let cls = "";
      if (answered) { if (oi === q.a) cls = "correct"; else if (oi === SES.sel) cls = "wrong"; else cls = "dim"; }
      else if (exam && SES.sel === oi) cls = "picked";
      const body = imgs ? `<span class="opt-img">${imgs[oi]}</span>${answered ? `<span class="opt-cap">${esc(q.o[oi])}</span>` : ""}` : `<span>${esc(q.o[oi])}</span>`;
      return `<button class="opt ${imgs ? "has-img" : ""} ${cls}" data-act="pick:${oi}" ${answered ? "disabled" : ""}><span class="ol">${"ABCD"[k]}</span>${body}</button>`;
    }).join("");
    const ok = answered && SES.sel === q.a;
    const ch = RB.find((c) => c.theme === q.t);
    app.innerHTML = `
    <div class="play">
      <div class="play-top"><button class="icon-btn" data-act="quit" aria-label="Quitter">✕</button>
        <div class="grow">${bar(pct(SES.i + (answered ? 1 : 0), total))}</div>
        <span class="counter">${SES.i + 1}/${total}</span>${exam && S.timer ? `<span class="timer" id="timer">${S.timer}</span>` : ""}</div>
      <div class="qcard ${answered ? (ok ? "is-ok" : "is-ko") : ""}">
        <div class="qmeta"><span class="chip sm">${TH[q.t].icon} ${TH[q.t].nom}</span>${!exam && q.g ? `<span class="chip sm grave" title="À l'examen, une erreur ici coûte 5 points">⚠️ Faute grave</span>` : ""}${q.gen && !exam ? `<span class="chip sm gen">🎲 Générée</span>` : ""}${q.r && !exam ? `<span class="chip sm">📍 ${q.r.map((r) => REGIONS[r]).join(", ")}</span>` : ""}${it.retry ? `<span class="chip sm">🔁 2e essai</span>` : ""}</div>
        ${media(q)}
        <h2 class="qtext">${esc(q.q)}</h2>
        ${!exam && !answered ? `<button class="doubt ${SES.guess ? "on" : ""}" data-act="guess">🤔 ${SES.guess ? "Je doute (la question reviendra)" : "Je ne suis pas sûr·e"}</button>` : ""}
        <div class="opts ${imgs ? "img-grid" : ""}">${opts}</div>
        ${exam ? `<button class="btn primary big full" data-act="confirm" ${SES.sel == null ? "disabled" : ""}>Valider</button>` : ""}
        ${answered ? `<div class="feedback">
            <p class="verdict">${ok ? (SES.guess ? "✅ Juste — mais tu doutais : on la revoit demain." : "✅ Bonne réponse !") : `❌ Raté. La bonne réponse : <b>${esc(q.o[q.a])}</b>`}</p>
            ${!ok && q.g ? `<p class="grave-note">⚠️ À l'examen, cette erreur coûterait <b>5 points</b>.</p>` : ""}
            <p class="expl">${esc(q.e)}</p>
            ${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}
            <p class="ref">${q.ref ? esc(q.ref) : ""}</p>
            ${!ok && !it.retry ? `<p class="tiny muted">🔁 Cette question reviendra à la fin de la session.</p>` : ""}
            <div class="fb-actions"><button class="btn ghost" data-act="tutor">🤖 Prof IA</button>${ch ? `<a class="btn ghost" href="#/regles/${ch.id}">📖 Règle</a>` : ""}<button class="btn primary grow" data-act="next">${SES.i + 1 < SES.items.length ? "Suivant →" : "Voir le bilan"}</button></div>
          </div>` : ""}
      </div>
      <p class="kbd-hint tiny muted">Clavier : 1-4 pour répondre · Entrée pour continuer</p>
    </div>`;
    if (!answered && !SES.sel) SES.shownAt = SES.shownAt || now();
    if (exam && S.timer && !answered) startTimer();
    if (answered) { const fb = $(".feedback"); fb && fb.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }

  function startTimer() {
    let left = S.timer;
    const el = $("#timer");
    timerId = setInterval(() => {
      left--;
      if (el) { el.textContent = left; el.classList.toggle("hot", left <= 5); }
      if (left <= 0) { clearInterval(timerId); SES.sel = null; examConfirm(true); }
    }, 1000);
  }

  function logEntry(it, q, sel, ok, extra = {}) {
    const e = { id: q.id, t: q.t, g: !!q.g, sel, ok, ms: Math.max(0, now() - (SES.shownAt || now())), ...extra };
    if (q.gen) e.snap = snap(q);
    if (it.retry) e.retry = true;
    return e;
  }

  function pick(oi) {
    if (!SES || SES.state === "done") return;
    if (SES.mode === "exam") { SES.sel = oi; vPlay(); return; }
    const it = SES.items[SES.i], q = qOf(it);
    SES.sel = oi; SES.state = "done";
    const ok = oi === q.a;
    recordQ(q, ok, SES.guess);
    SES.log.push(logEntry(it, q, oi, ok, SES.guess ? { guess: true } : {}));
    if (!ok && !it.retry) SES.items.push({ ...it, perm: permFor(q), retry: true });
    persistSes(); save(); beep(ok); vPlay();
  }

  function examConfirm(timeout) {
    if (!SES || (!timeout && SES.sel == null)) return;
    clearInterval(timerId);
    const it = SES.items[SES.i], q = qOf(it);
    const ok = SES.sel === q.a;
    recordQ(q, ok, false);
    SES.log.push(logEntry(it, q, SES.sel, ok, timeout ? { timeout: true } : {}));
    SES.sel = null;
    if (SES.i + 1 < SES.items.length) { SES.i++; SES.shownAt = now(); persistSes(); save(); vPlay(); }
    else finish();
  }

  function next() {
    if (!SES) return;
    if (SES.i + 1 < SES.items.length) { SES.i++; SES.state = "ask"; SES.sel = null; SES.guess = false; SES.shownAt = now(); persistSes(); vPlay(); }
    else finish();
  }

  function finish() {
    const dur = Math.round((now() - SES.start) / 1000);
    SES.dur = dur;
    if (SES.mode === "signs") { checkBadges(); go("#/result"); return; }
    const first = SES.log.filter((l) => !l.retry);
    let rec;
    if (SES.mode === "exam") {
      const wrong = first.filter((l) => !l.ok);
      const grave = wrong.filter((l) => l.g).length, light = wrong.length - grave;
      const score = Math.max(0, 50 - light - 5 * grave);
      rec = { id: SES.id, kind: "exam", d: now(), score, grave, light, pass: score >= 41, dur, region: S.region, timer: S.timer, items: first };
      S.exams.push(rec);
      if (S.exams.length > 100) S.exams = S.exams.slice(-100);
    } else {
      const okN = first.filter((l) => l.ok).length;
      rec = { id: SES.id, kind: "session", title: SES.title, d: now(), n: first.length, ok: okN, dur, items: first };
      S.sessions.push(rec);
      if (S.sessions.length > 150) S.sessions = S.sessions.slice(-150);
    }
    SES.rec = rec;
    if (SES.daily && rec.kind === "session") S.daily[today()] = Math.max(S.daily[today()] || 0, rec.ok);
    S.saved = null;
    save();
    checkBadges();
    if (cloudUser()) window.Cloud.saveItem(rec.kind === "exam" ? "exams" : "sessions", rec).catch((e) => console.warn(e));
    go(rec.kind === "exam" ? `#/detail/${rec.id}` : "#/result");
    if (rec.kind === "exam" && rec.pass) setTimeout(confetti, 300);
  }

  function vResult() {
    if (!SES) { go("#/"); return; }
    const isSigns = SES.mode === "signs";
    const first = SES.log.filter((l) => !l.retry);
    const okN = first.filter((l) => l.ok).length;
    const wrong = first.filter((l) => !l.ok);
    const p = pct(okN, first.length);
    const avg = first.length ? Math.round(first.reduce((a, l) => a + (l.ms || 0), 0) / first.length / 100) / 10 : 0;
    let errs = "";
    if (wrong.length && !isSigns) errs = `<h2>Tes erreurs à comprendre <small class="muted">(${wrong.length})</small></h2><div class="list">${wrong.map(errDetails).join("")}</div>`;
    else if (wrong.length) errs = `<h2>À retenir</h2><div class="list">${wrong.map((l) => `<div class="row static sign-row">${SG[l.id].svg()}<span class="grow"><b>${esc(SG[l.id].nom)}</b><small>${esc(SG[l.id].sens)}</small></span></div>`).join("")}</div>`;
    const wrongStatic = wrong.filter((l) => !l.snap && QBY[l.id]).map((l) => l.id);
    app.innerHTML = `<div class="result ${p >= 82 ? "pass" : ""}"><div class="big-score">${okN}<small>/${first.length}</small></div><h1>${p >= 90 ? "Excellent ! 🔥" : p >= 75 ? "Bien joué 👍" : p >= 50 ? "Ça vient 💪" : "On continue 🧠"}</h1><p>${p} % du premier coup${SES.log.length > first.length ? ` · ${plural(SES.log.length - first.length, "question")} retravaillée${SES.log.length - first.length > 1 ? "s" : ""}` : ""}.</p>
      <div class="rules-grid"><div><b>${mmss(SES.dur || 0)}</b><span>durée</span></div><div><b>${avg} s</b><span>par question</span></div><div><b>${streak()} j</b><span>série</span></div></div></div>
      ${errs}
      <div class="stack">
        ${wrongStatic.length ? `<button class="btn primary big full" data-act="redo:${wrongStatic.join(",")}">🔁 Refaire mes erreurs maintenant</button>` : ""}
        ${isSigns ? `<button class="btn primary big full" data-act="signquiz">Nouveau quiz panneaux</button>` : `<button class="btn big full" data-act="mix">Session suivante</button>`}
        ${SES.rec ? `<a class="btn ghost full" href="#/detail/${SES.rec.id}">Voir le détail de la session</a>` : ""}
        <a class="btn ghost full" href="#/">Accueil</a></div>`;
  }

  function errDetails(l) {
    const q = qOf(l);
    if (!q) return "";
    return `<details class="err"><summary>${l.g ? "⚠️ " : ""}${esc(q.q)}</summary>${media(q)}<p><span class="badge ko">Ta réponse</span> ${optLabel(q, l.sel)}</p><p><span class="badge ok">Bonne réponse</span> ${esc(q.o[q.a])}</p><p class="expl">${esc(q.e)}</p>${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}</details>`;
  }

  /* ---------- quiz panneaux ---------- */
  function vPlaySign() {
    const it = SES.items[SES.i];
    const sg = SG[it.id];
    const answered = SES.state === "done";
    const total = SES.items.length;
    app.innerHTML = `<div class="play">
      <div class="play-top"><button class="icon-btn" data-act="quit" aria-label="Quitter">✕</button><div class="grow">${bar(pct(SES.i + (answered ? 1 : 0), total))}</div><span class="counter">${SES.i + 1}/${total}</span></div>
      <div class="qcard ${answered ? (SES.sel === it.id ? "is-ok" : "is-ko") : ""}">
        <div class="qmeta"><span class="chip sm">${window.SIGN_CATS[sg.cat]}</span></div>
        <div class="media sign-wrap big">${sg.svg()}</div>
        <h2 class="qtext">Que signifie ce panneau ?</h2>
        <div class="opts">${it.opts.map((k, i) => { let cls = ""; if (answered) cls = k === it.id ? "correct" : k === SES.sel ? "wrong" : "dim"; return `<button class="opt ${cls}" data-act="spick:${k}" ${answered ? "disabled" : ""}><span class="ol">${"ABCD"[i]}</span><span>${esc(SG[k].nom)}</span></button>`; }).join("")}</div>
        ${answered ? `<div class="feedback"><p class="verdict">${SES.sel === it.id ? "✅ Exact !" : `❌ C'était : <b>${esc(sg.nom)}</b> (${esc(sg.code)})`}</p><p class="expl">${esc(sg.sens)}</p><div class="fb-actions"><button class="btn primary grow" data-act="next">${SES.i + 1 < total ? "Suivant →" : "Voir le bilan"}</button></div></div>` : ""}
      </div></div>`;
  }
  function spick(k) {
    if (!SES || SES.state === "done") return;
    const it = SES.items[SES.i];
    const ok = k === it.id;
    SES.sel = k; SES.state = "done";
    record(S.signs, it.id, ok, false); countAnswer(ok);
    if (!ok) { const key = `${it.id}>${k}`; S.conf[key] = (S.conf[key] || 0) + 1; if (!it.retry) SES.items.push({ id: it.id, opts: shuffle(it.opts), retry: true }); }
    SES.log.push({ id: it.id, ok, sel: k, retry: !!it.retry });
    save(); beep(ok); vPlaySign();
  }

  /* ================================================================== détail d'un examen / d'une session */
  function vDetail(id) {
    const rec = S.exams.find((e) => e.id === id) || S.sessions.find((s) => s.id === id);
    if (!rec) { app.innerHTML = `<a class="back" href="#/historique">← Historique</a><div class="empty">🔍<p>Introuvable (peut-être sur un autre appareil : connecte-toi pour synchroniser).</p></div>`; return; }
    const isExam = rec.kind === "exam";
    const items = (rec.items || []).map((l, i) => ({ ...l, n: i + 1, q: qOf(l) })).filter((l) => l.q);
    const wrong = items.filter((l) => !l.ok);
    const avg = items.length ? items.reduce((a, l) => a + (l.ms || 0), 0) / items.length / 1000 : 0;
    const slow = items.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 3);
    const prev = isExam ? S.exams.filter((e) => e.d < rec.d).slice(-1)[0] : null;
    const per = {};
    items.forEach((l) => { per[l.t] = per[l.t] || [0, 0]; per[l.t][1]++; if (l.ok) per[l.t][0]++; });
    const filter = (detailFilter[id] || "err");
    const shown = items.filter((l) => filter === "all" || (filter === "err" && !l.ok) || (filter === "grave" && l.g) || (filter === "slow" && slow.includes(l)) || (filter === "doubt" && l.guess));
    let head;
    if (isExam) {
      const why = rec.pass ? (rec.grave ? `Réussi avec ${plural(rec.grave, "faute grave", "fautes graves")} — attention, c'était juste.` : "Bravo, aucune faute grave !") : rec.grave >= 2 ? `Échec : ${rec.grave} fautes graves (−${rec.grave * 5} points à elles seules).` : `Échec : il manque ${plural(41 - rec.score, "point")}.`;
      head = `<div class="result ${rec.pass ? "pass" : "fail"}"><p class="tiny muted">Examen blanc · ${dateFR(rec.d)} à ${timeFR(rec.d)}${rec.region ? ` · ${REGIONS[rec.region]}` : ""}${rec.timer ? ` · chrono ${rec.timer} s` : ""}</p><div class="big-score">${rec.score}<small>/50</small></div><h1>${rec.pass ? "Réussi 🎉" : "Pas encore…"}</h1><p>${why}</p>
        <div class="rules-grid"><div><b>${rec.light}</b><span>erreur${rec.light > 1 ? "s" : ""} (−1)</span></div><div><b>${rec.grave}</b><span>faute${rec.grave > 1 ? "s" : ""} grave${rec.grave > 1 ? "s" : ""} (−5)</span></div><div><b>${mmss(rec.dur)}</b><span>durée</span></div><div><b>${avg.toFixed(1).replace(".", ",")} s</b><span>par question</span></div></div>
        ${prev ? `<p class="cmp">${rec.score > prev.score ? `📈 +${rec.score - prev.score} points` : rec.score < prev.score ? `📉 ${rec.score - prev.score} points` : "➡️ Même score"} par rapport à ton examen précédent (${prev.score}/50).</p>` : ""}</div>`;
    } else {
      head = `<div class="result"><p class="tiny muted">${esc(rec.title || "Session")} · ${dateFR(rec.d)} à ${timeFR(rec.d)}</p><div class="big-score">${rec.ok}<small>/${rec.n}</small></div><h1>${pct(rec.ok, rec.n)} % de réussite</h1><div class="rules-grid"><div><b>${mmss(rec.dur)}</b><span>durée</span></div><div><b>${avg.toFixed(1).replace(".", ",")} s</b><span>par question</span></div><div><b>${wrong.length}</b><span>erreur${wrong.length > 1 ? "s" : ""}</span></div></div></div>`;
    }
    const wrongStatic = wrong.filter((l) => !l.snap && QBY[l.id]).map((l) => l.id);
    app.innerHTML = `<a class="back" href="#/historique">← Historique</a>${head}
      ${cloudUser() || window.Cloud ? `<div class="ai-box" id="ai-bilan"><button class="btn primary full" data-act="bilan:${rec.id}">🤖 Bilan personnalisé du prof IA</button>${rec.aiBilan ? `<div class="ai-answer">${md(rec.aiBilan)}</div>` : ""}</div>` : ""}
      <h2>Par thème</h2><div class="list">${Object.entries(per).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([t, [o, n]]) => `<button class="row" data-act="train:${t}"><span class="ti">${TH[t].icon}</span><span class="grow"><b>${TH[t].nom}</b>${bar(pct(o, n), o === n ? "ok" : o / n < 0.7 ? "ko" : "")}</span><small>${o}/${n}</small></button>`).join("")}</div>
      <h2>Les ${items.length} questions</h2>
      <div class="seg filt">${[["err", `Erreurs (${wrong.length})`], ["grave", "Fautes graves"], ["slow", "Plus lentes"], ["all", "Toutes"]].concat(items.some((l) => l.guess) ? [["doubt", "Doutes"]] : []).map(([k, l]) => `<button class="${filter === k ? "on" : ""}" data-act="filt:${id}:${k}">${l}</button>`).join("")}</div>
      <div class="list">${shown.length ? shown.map((l) => detailItem(l)).join("") : `<p class="muted">Rien dans ce filtre 🎉</p>`}</div>
      <div class="stack">${wrongStatic.length ? `<button class="btn primary big full" data-act="redo:${wrongStatic.join(",")}">🔁 Retravailler ces ${wrongStatic.length} erreurs</button>` : ""}${isExam ? `<button class="btn big full" data-act="startexam">Nouvel examen blanc</button>` : `<button class="btn big full" data-act="mix">Nouvelle session</button>`}</div>`;
  }
  const detailFilter = {};
  function detailItem(l) {
    const q = l.q;
    return `<details class="err ${l.ok ? "ok" : "ko"}"><summary><span class="qn">${l.n}</span> <span class="badge ${l.ok ? "ok" : "ko"}">${l.ok ? "✓" : l.timeout ? "⏱" : "✗"}</span> ${l.g ? "⚠️ " : ""}${esc(q.q)} <small class="muted">· ${((l.ms || 0) / 1000).toFixed(1).replace(".", ",")} s</small></summary>
      ${media(q)}
      ${l.ok ? `<p><span class="badge ok">Ta réponse</span> ${esc(q.o[q.a])}</p>` : `<p><span class="badge ko">Ta réponse</span> ${optLabel(q, l.sel)}</p><p><span class="badge ok">Bonne réponse</span> ${esc(q.o[q.a])}</p>`}
      <p class="expl">${esc(q.e)}</p>${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}
      <button class="link" data-act="tutorq:${encodeURIComponent(JSON.stringify({ id: l.id, sel: l.sel, snap: l.snap || null }))}">🤖 Demander au prof IA</button></details>`;
  }

  /* ================================================================== historique */
  function vHistory() {
    const tab = histTab;
    const ex = S.exams.slice().reverse(), ss = S.sessions.slice().reverse();
    app.innerHTML = `<a class="back" href="#/stats">← Progrès</a><h1 class="page-h">Historique</h1>
      <p class="muted tiny">${cloudUser() ? "☁️ Tout est sauvegardé dans ton compte." : "Enregistré sur cet appareil. <a href='#/compte'>Crée un compte</a> pour le garder partout."}</p>
      <div class="seg"><button class="${tab === "exams" ? "on" : ""}" data-act="htab:exams">Examens (${ex.length})</button><button class="${tab === "sessions" ? "on" : ""}" data-act="htab:sessions">Sessions (${ss.length})</button></div>
      <div class="list" style="margin-top:12px">${tab === "exams" ? (ex.length ? ex.map(examRow).join("") : `<p class="muted">Aucun examen blanc pour l'instant.</p>`) : ss.length ? ss.map((s) => `<a class="row" href="#/detail/${s.id}"><span class="badge ${pct(s.ok, s.n) >= 82 ? "ok" : pct(s.ok, s.n) >= 60 ? "mid" : "ko"}">${pct(s.ok, s.n)} %</span><span class="grow"><b>${esc(s.title || "Session")}</b> <small class="muted">· ${s.ok}/${s.n} · ${mmss(s.dur)}</small></span><small class="muted">${dateFR(s.d)}</small></a>`).join("") : `<p class="muted">Aucune session terminée pour l'instant.</p>`}</div>`;
  }
  let histTab = "exams";

  /* ================================================================== livre des règles */
  const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let ruleQuery = "";
  function vRules(id) {
    if (id) return vChapter(id);
    const qn = norm(ruleQuery.trim());
    let results = "";
    if (qn.length >= 2) {
      const hits = [];
      RB.forEach((c) => c.sections.forEach((s, i) => { const txt = strip(s.html); const n = norm(s.t + " " + txt); if (n.includes(qn)) { const pos = norm(txt).indexOf(qn); const ex = pos >= 0 ? txt.slice(Math.max(0, pos - 60), pos + 120) : txt.slice(0, 160); hits.push({ c, s, i, ex }); } }));
      results = `<h2>${plural(hits.length, "résultat")}</h2><div class="list">${hits.slice(0, 40).map((h) => `<a class="row" href="#/regles/${h.c.id}/${h.i}"><span class="ti">${h.c.icon}</span><span class="grow"><b>${esc(h.s.t)}</b><small>${esc(h.c.titre)} · …${esc(h.ex)}…</small></span></a>`).join("")}</div>`;
    }
    app.innerHTML = `<h1 class="page-h">Livre des règles</h1>
      <div class="search"><input id="rq" type="search" placeholder="Chercher une règle : tirette, disque, 1,5 m, alcool…" value="${esc(ruleQuery)}" autocomplete="off"></div>
      ${results}
      ${!results ? `<h2>Fiches express</h2><div class="hscroll">${L.map((l) => `<a class="mini-card" href="#/fiche/${l.id}"><b>${esc(l.titre)}</b><small>${esc(l.intro)}</small></a>`).join("")}</div>
      <h2>Chapitres</h2><div class="lessons">${RB.map((c) => { const s = themeStats(c.theme); return `<a class="lesson-card" href="#/regles/${c.id}"><span class="ti">${c.icon}</span><span class="grow"><b>${esc(c.titre)}</b><small>${c.sections.map((x) => esc(x.t)).join(" · ")}</small>${bar(pct(s.mastered, s.total))}</span></a>`; }).join("")}</div>
      <button class="btn full" data-act="tutor-free">🤖 Poser une question au prof IA</button>` : ""}`;
    const inp = $("#rq");
    inp.addEventListener("input", () => { ruleQuery = inp.value; const pos = inp.selectionStart; vRules(); const n = $("#rq"); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function vChapter(arg) {
    const [cid, sec] = arg.split("/");
    const c = RB.find((x) => x.id === cid);
    if (!c) { go("#/regles"); return; }
    const idx = RB.indexOf(c);
    const s = themeStats(c.theme);
    app.innerHTML = `<a class="back" href="#/regles">← Livre des règles</a>
      <article class="lesson"><p class="tiny muted">Chapitre ${idx + 1}/${RB.length}</p><h1>${c.icon} ${esc(c.titre)}</h1>
      <nav class="toc">${c.sections.map((x, i) => `<a href="#/regles/${c.id}/${i}">${esc(x.t)}</a>`).join("")}</nav>
      ${c.sections.map((x, i) => `<section class="rule-sec" id="sec-${i}"><h2>${esc(x.t)}</h2><div class="lesson-body">${x.html}</div></section>`).join("")}
      <div class="stack"><button class="btn primary big full" data-act="train:${c.theme}">S'entraîner : ${TH[c.theme].nom} (${s.total} questions)</button><button class="btn full" data-act="tutor-free:${c.id}">🤖 Une question sur ce chapitre ?</button></div>
      <div class="pager">${idx > 0 ? `<a class="btn ghost" href="#/regles/${RB[idx - 1].id}">← ${esc(RB[idx - 1].titre)}</a>` : "<span></span>"}${idx < RB.length - 1 ? `<a class="btn ghost" href="#/regles/${RB[idx + 1].id}">${esc(RB[idx + 1].titre)} →</a>` : ""}</div></article>`;
    if (sec != null) setTimeout(() => { const el = $(`#sec-${sec}`); el && el.scrollIntoView({ block: "start" }); el && el.classList.add("flash"); }, 50);
  }

  function vLesson(id) {
    const l = L.find((x) => x.id === id) || L[0];
    const s = themeStats(l.theme);
    const ch = RB.find((c) => c.theme === l.theme);
    app.innerHTML = `<a class="back" href="#/regles">← Livre des règles</a>
    <article class="lesson"><h1>${esc(l.titre)}</h1><p class="lead">${esc(l.intro)}</p>
      <div class="facts">${l.chiffres.map(([v, t]) => `<div><b>${v}</b><span>${t}</span></div>`).join("")}</div>
      <div class="lesson-body">${l.html}</div>
      ${l.pieges && l.pieges.length ? `<div class="traps"><h3>🪤 Les pièges</h3><ul>${l.pieges.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
      <div class="stack">${["nouveautes", "code2027", "examen"].includes(l.id) ? "" : `<button class="btn primary big full" data-act="train:${l.theme}">S'entraîner : ${TH[l.theme].nom} (${s.total} questions)</button>`}${ch ? `<a class="btn full" href="#/regles/${ch.id}">📖 Le chapitre complet</a>` : ""}</div>
    </article>`;
  }

  /* ================================================================== panneaux */
  function vSigns() {
    const learned = Object.values(S.signs).filter((r) => r.box >= MASTER_BOX).length;
    app.innerHTML = `<h1 class="page-h">Panneaux</h1>
    <div class="actions"><button class="action primary" data-act="signquiz"><span class="ai">🛑</span><span><b>Quiz panneaux · 15</b><small>${learned}/${Object.keys(SG).length} panneaux maîtrisés · priorité à ceux que tu rates</small></span></button>
    <button class="action" data-act="gen:signpick"><span class="ai">🔍</span><span><b>Trouve le bon panneau · 10</b><small>On te donne le sens, tu choisis le dessin</small></span></button></div>
    ${Object.entries(window.SIGN_CATS).map(([c, nom]) => `<h2>${nom}</h2><div class="sign-grid">${Object.keys(SG).filter((k) => SG[k].cat === c).map((k) => { const r = S.signs[k]; return `<button class="sign-card ${r ? (r.box >= MASTER_BOX ? "m" : r.box === 0 ? "w" : "") : ""}" data-act="sign:${k}">${SG[k].svg()}<b>${esc(SG[k].code)}</b><small>${esc(SG[k].nom)}</small></button>`; }).join("")}</div>`).join("")}
    <p class="tiny muted">Pastille verte = maîtrisé · rouge = raté la dernière fois.</p>`;
  }
  function signModal(k) {
    const sg = SG[k];
    modal(`<div class="sign-modal">${sg.svg()}<h2>${esc(sg.nom)}</h2><p class="chip sm">${esc(sg.code)} · ${window.SIGN_CATS[sg.cat]}</p><p>${esc(sg.sens)}</p></div>`);
  }

  /* ================================================================== progrès */
  function vStats() {
    const st = themeStats();
    const ex = S.exams.slice(-12);
    const totalAns = Object.values(S.days).reduce((a, n) => a + n, 0);
    const hard = pool().filter((q) => S.q[q.id] && S.q[q.id].ko > 0).sort((a, b) => S.q[b.id].ko - S.q[a.id].ko || S.q[a.id].ok - S.q[b.id].ok).slice(0, 6);
    const confs = Object.entries(S.conf).sort((a, b) => b[1] - a[1]).slice(0, 4).filter(([k]) => { const [a, b] = k.split(">"); return SG[a] && SG[b]; });
    const passRate = S.exams.length ? pct(S.exams.filter((e) => e.pass).length, S.exams.length) : null;
    const days = [];
    for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(S.days[today(d)] || 0); }
    const maxD = Math.max(1, ...days);
    const studyMin = Math.round([...S.exams, ...S.sessions].reduce((a, x) => a + (x.dur || 0), 0) / 60);
    app.innerHTML = `<h1 class="page-h">Progression</h1>
    <div class="kpis"><div class="kpi card"><b>${totalAns}</b><span>réponses</span></div><div class="kpi card"><b>${st.answers ? st.acc + " %" : "—"}</b><span>réussite</span></div><div class="kpi card"><b>${st.mastered}/${st.total}</b><span>maîtrisées</span></div><div class="kpi card"><b>${passRate == null ? "—" : passRate + " %"}</b><span>examens réussis</span></div><div class="kpi card"><b>${studyMin} min</b><span>d'entraînement</span></div><div class="kpi card"><b>${S.exams.length + S.sessions.length}</b><span>sessions</span></div></div>
    <div class="stack-row" style="margin-top:12px"><a class="btn grow" href="#/historique">🗂️ Historique</a><a class="btn grow" href="#/trophees">🏆 Trophées ${Object.keys(S.badges).length}/${BADGES.length}</a></div>
    <h2>Activité (28 jours)</h2><div class="card"><div class="heat">${days.map((v) => `<i style="opacity:${v ? 0.25 + (0.75 * v) / maxD : 0.08}" title="${v} réponses"></i>`).join("")}</div><p class="tiny muted">🔥 Série actuelle : ${plural(streak(), "jour")}</p></div>
    ${ex.length ? `<h2>Examens blancs</h2><div class="card"><div class="exam-chart">${ex.map((e) => `<a class="col ${e.pass ? "ok" : "ko"}" href="#/detail/${e.id}" title="${e.score}/50"><i style="height:${Math.max(3, (e.score / 50) * 100)}%"></i><small>${e.score}</small></a>`).join("")}<div class="pass-line" style="bottom:${(41 / 50) * 100}%"><span>41</span></div></div></div>` : ""}
    <h2>Par thème</h2><div class="list">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; return `<button class="row" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="grow"><b>${t.nom}</b>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total} maîtrisées · ${s.seen}/${s.total} vues${s.answers ? ` · ${s.acc} %` : ""}</small></span></button>`; }).join("")}</div>
    ${Object.keys(S.gen).length ? `<h2>Situations générées</h2><div class="list">${Object.entries(S.gen).filter(([k]) => GEN.KINDS[k]).map(([k, g]) => `<button class="row" data-act="gen:${k}"><span class="ti">🎲</span><span class="grow"><b>${GEN.KINDS[k].nom}</b>${bar(pct(g.ok, g.ok + g.ko))}<small>${g.ok}/${g.ok + g.ko} réussies</small></span></button>`).join("")}</div>` : ""}
    ${hard.length ? `<h2>Tes questions les plus difficiles</h2><div class="list">${hard.map((q) => `<div class="row static"><span class="badge ko">${S.q[q.id].ko}×</span><span class="grow"><small>${esc(q.q)}</small></span></div>`).join("")}</div><button class="btn full" data-act="redo:${hard.map((q) => q.id).join(",")}">Les retravailler</button>` : ""}
    ${confs.length ? `<h2>Panneaux que tu confonds</h2><div class="list">${confs.map(([k, n]) => { const [a, b] = k.split(">"); return `<div class="row static"><div class="pair">${signTile(a)}<span>≠</span>${signTile(b)}</div><small class="grow">${esc(SG[a].nom)} <i>pris pour</i> ${esc(SG[b].nom)} (${n}×)</small></div>`; }).join("")}</div>` : ""}`;
  }

  function vErrors() {
    const ids = errorIds();
    app.innerHTML = `<a class="back" href="#/train">← S'entraîner</a><h1 class="page-h">Carnet d'erreurs</h1>
    <p class="muted">Toutes les questions déjà ratées, avec l'explication. Une question sort du rouge quand tu la réussis plusieurs fois, à quelques jours d'intervalle.</p>
    ${ids.length ? `<button class="btn primary big full" data-act="redo:${ids.slice(0, 30).join(",")}">🔁 Réviser ${Math.min(30, ids.length)} erreur${ids.length > 1 ? "s" : ""}</button>
    <div class="list" style="margin-top:12px">${ids.map((id) => { const q = QBY[id], r = S.q[id]; const st = r.box >= MASTER_BOX ? ["ok", "Corrigée"] : r.box > 0 ? ["mid", "En cours"] : ["ko", "À revoir"]; return `<details class="err"><summary><span class="badge ${st[0]}">${st[1]}</span> ${q.g ? "⚠️ " : ""}${esc(q.q)} <small class="muted">· ratée ${r.ko}×</small></summary>${media(q)}<p><span class="badge ok">Réponse</span> ${esc(q.o[q.a])}</p><p class="expl">${esc(q.e)}</p>${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}<button class="link" data-act="tutorq:${encodeURIComponent(JSON.stringify({ id }))}">🤖 Demander au prof IA</button></details>`; }).join("")}</div>` : `<div class="empty">🎉<p>Aucune erreur enregistrée pour l'instant.<br>Lance une session pour commencer !</p><button class="btn primary" data-act="mix">S'entraîner</button></div>`}`;
  }

  /* ================================================================== perception des risques */
  function vTpr(id) {
    if (!id) {
      app.innerHTML = `<a class="back" href="#/train">← S'entraîner</a><h1 class="page-h">Perception des risques</h1>
      <p class="muted">Ta voiture roule ; touche <b>« Danger »</b> dès qu'un danger se concrétise (pas avant, pas en rafale). Plus tu réagis tôt dans la fenêtre de danger, plus tu marques de points (5 max). C'est le principe du test de perception des risques (TPR), obligatoire en Wallonie.</p>
      <div class="kpis"><div class="kpi card"><b>${tprTotal()}/${TPR.SCENES.length * 5}</b><span>meilleur total</span></div><div class="kpi card"><b>${Object.keys(S.tpr).length}/${TPR.SCENES.length}</b><span>scènes faites</span></div></div>
      <div class="list" style="margin-top:12px">${TPR.SCENES.map((sc, i) => { const r = S.tpr[sc.id]; return `<a class="row" href="#/tpr/${sc.id}"><span class="qn">${i + 1}</span><span class="grow"><b>${esc(sc.titre)}</b><small>${esc(sc.zone)}</small></span>${r ? `<span class="stars">${"★".repeat(r.best)}${"☆".repeat(5 - r.best)}</span>` : `<span class="badge mid">Nouveau</span>`}</a>`; }).join("")}</div>`;
      return;
    }
    const sc = TPR.SCENES.find((x) => x.id === id);
    if (!sc) { go("#/tpr"); return; }
    const idx = TPR.SCENES.indexOf(sc);
    app.innerHTML = `<a class="back" href="#/tpr">← Scènes</a><h1 class="page-h">${idx + 1}. ${esc(sc.titre)}</h1><div id="tprhost"><div class="card tpr-intro"><p>${esc(sc.zone)}</p><p class="muted">Tiens-toi prêt·e : la scène dure ${Math.round(sc.dur)} secondes.</p><button class="btn primary big full" id="tgo">▶ Démarrer</button></div></div>`;
    $("#tgo").addEventListener("click", () => {
      tprStop = TPR.play($("#tprhost"), sc, (res, clicks) => {
        tprStop = null;
        const r = S.tpr[sc.id] || { best: 0, n: 0 };
        r.best = Math.max(r.best, res.pts); r.n++; r.last = now();
        S.tpr[sc.id] = r; save(); checkBadges();
        const next = TPR.SCENES[idx + 1];
        $("#tprhost").innerHTML = `<div class="result ${res.pts >= 3 ? "pass" : res.pts ? "" : "fail"}"><div class="big-score">${res.pts}<small>/5</small></div><p class="stars big">${"★".repeat(res.pts)}${"☆".repeat(5 - res.pts)}</p><p><b>${esc(res.why)}</b></p>
          <div class="tpr-tl"><span class="win" style="left:${(sc.win[0] / sc.dur) * 100}%;width:${((sc.win[1] - sc.win[0]) / sc.dur) * 100}%"></span>${clicks.map((c) => `<b style="left:${Math.min(100, (c / sc.dur) * 100)}%"></b>`).join("")}</div>
          <p class="tiny muted">Zone jaune : fenêtre de danger (${sc.win[0].toFixed(1).replace(".", ",")} s → ${sc.win[1].toFixed(1).replace(".", ",")} s). Traits : tes clics.</p></div>
          <div class="card"><h3 style="margin-top:0">Ce qu'il fallait voir</h3><p>${esc(sc.why)}</p></div>
          <div class="stack"><button class="btn big full" data-act="go:#/tpr/${sc.id}">↻ Rejouer</button>${next ? `<a class="btn primary big full" href="#/tpr/${next.id}">Scène suivante →</a>` : `<a class="btn primary big full" href="#/tpr">Voir mes scores</a>`}</div>`;
      });
    });
  }

  function vBadges() {
    const got = Object.keys(S.badges).length;
    app.innerHTML = `<a class="back" href="#/stats">← Progrès</a><h1 class="page-h">Trophées <small class="muted">${got}/${BADGES.length}</small></h1>
      <div class="badge-grid">${BADGES.map((b) => { const d = S.badges[b.id]; return `<div class="trophy ${d ? "on" : ""}"><span class="ti">${b.icon}</span><b>${esc(b.nom)}</b><small>${esc(b.d)}</small>${d ? `<em>${dateFR(d)}</em>` : ""}</div>`; }).join("")}</div>`;
  }

  /* ================================================================== compte */
  function vAccount() {
    const u = cloudUser();
    const ready = !!window.Cloud;
    app.innerHTML = `<a class="back" href="#/">← Accueil</a><h1 class="page-h">Mon compte</h1>
    ${window.PERMIS_NO_CLOUD ? `<div class="card"><p>Dans cet aperçu, le compte et le prof IA sont désactivés. Ta progression est gardée dans ce navigateur.</p><p>Pour te connecter, synchroniser tes appareils et parler au prof IA, ouvre la version en ligne :</p><p><b>jpdev-create.github.io/les-petites-fees/permis/</b></p></div>` : !ready ? `<div class="card"><p>Connexion au service en cours… Si ce message reste affiché, vérifie ta connexion internet. L'appli fonctionne quand même hors ligne, ta progression est gardée sur cet appareil.</p></div>` : u ? `
      <div class="card account"><div class="avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : "👤"}</div><div class="grow"><b>${esc(u.displayName || "Mon compte")}</b><small class="muted">${esc(u.email || "")}</small><p class="tiny">${syncState === "error" ? "⚠️ Synchronisation impossible pour le moment (hors ligne ?). Tes données restent sur l'appareil et partiront dès que possible." : "☁️ Sessions, examens, erreurs et réglages sauvegardés dans ton compte."}</p></div></div>
      <div class="stack"><button class="btn full" data-act="syncnow">🔄 Synchroniser maintenant</button><button class="btn ghost full" data-act="logout">Se déconnecter</button></div>
      <h2>Ce qui est sauvegardé</h2><ul class="muted"><li>${plural(S.exams.length, "examen blanc", "examens blancs")} détaillé${S.exams.length > 1 ? "s" : ""} (chaque réponse, chaque temps)</li><li>${plural(S.sessions.length, "session")} d'entraînement</li><li>Ta progression sur ${Object.keys(S.q).length} questions et ${Object.keys(S.signs).length} panneaux</li><li>Ton carnet d'erreurs et ta révision espacée</li></ul>
      <details class="err"><summary>Supprimer mes données du nuage</summary><p class="tiny">Efface ta progression enregistrée dans ton compte (pas celle de cet appareil).</p><button class="btn danger" data-act="wipecloud">Supprimer définitivement</button></details>` : `
      <div class="card"><h2 style="margin-top:0">Sauvegarde tout, partout</h2><ul><li>☁️ Sessions, examens détaillés et erreurs sauvegardés</li><li>📱 Continue sur ton téléphone, ta tablette ou ton ordi</li><li>🤖 Accès au prof IA qui explique tes erreurs</li></ul>
        <button class="btn primary big full" data-act="google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continuer avec Google</button>
        <div class="or"><span>ou</span></div>
        <form id="linkform" class="linkform"><input type="email" id="lmail" required placeholder="ton.adresse@email.be" autocomplete="email"><button class="btn" type="submit">Recevoir un lien</button></form>
        <p class="tiny muted">Pas de mot de passe : tu reçois un lien de connexion par e-mail. Ta progression actuelle sera fusionnée avec ton compte.</p></div>`}`;
    const f = $("#linkform");
    f && f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mail = $("#lmail").value;
      try { await window.Cloud.sendLink(mail); toast("📧 Lien envoyé ! Ouvre-le sur cet appareil."); }
      catch (err) { toast("Envoi impossible : " + (err.code || err.message)); }
    });
  }

  /* ================================================================== prof IA */
  function aiAllowed() {
    if (window.PERMIS_NO_CLOUD) { modal(`<h2>🤖 Prof IA</h2><p>Le prof IA fonctionne dans la version en ligne, avec un compte gratuit :</p><p><b>jpdev-create.github.io/les-petites-fees/permis/</b></p>`); return false; }
    if (!window.Cloud) { toast("Le prof IA a besoin d'internet."); return false; }
    if (!cloudUser()) { modal(`<h2>🤖 Prof IA</h2><p>Le prof IA est réservé aux comptes (c'est gratuit) : il explique tes erreurs, répond à tes questions et analyse tes examens.</p><a class="btn primary full" href="#/compte" data-close>Créer mon compte</a>`); return false; }
    if (S.ai.day !== today()) S.ai = { day: today(), n: 0 };
    if (S.ai.n >= AI_DAILY) { toast(`Limite de ${AI_DAILY} questions au prof IA par jour atteinte. À demain !`); return false; }
    return true;
  }
  function questionContext(q, sel) {
    return `Question d'examen (thème « ${TH[q.t].nom} »${q.g ? ", faute grave" : ""}) :\n« ${q.q} »\nRéponses proposées : ${q.o.map((o, i) => `${"ABCD"[i]}) ${o}`).join(" ; ")}\nBonne réponse : ${q.o[q.a]}\n${sel != null && sel !== q.a ? `L'élève a répondu : ${q.o[sel]}\n` : ""}Explication officielle : ${q.e}${q.p ? `\nPiège : ${q.p}` : ""}${q.sc ? "\n(La question montre un schéma de carrefour vu du dessus.)" : ""}\nRégion de l'élève : ${REGIONS[S.region]}.`;
  }
  function openTutor({ title, context, starters, first }) {
    if (!aiAllowed()) return;
    const hist = [];
    if (context) { hist.push({ role: "user", text: context + "\n\nRéponds aux questions de l'élève sur ce sujet." }); hist.push({ role: "model", text: "D'accord, je suis prêt à aider." }); }
    const m = document.createElement("div");
    m.className = "modal tutor";
    m.innerHTML = `<div class="modal-box chat" role="dialog" aria-modal="true"><div class="chat-head"><b>🤖 ${esc(title || "Prof IA")}</b><button class="icon-btn" data-close aria-label="Fermer">✕</button></div>
      <div class="chat-log" id="chatlog"><div class="msg bot"><p>Salut ! Pose-moi ta question 🙂</p></div></div>
      <div class="chips-row" id="starters">${(starters || []).map((s) => `<button class="chip sm" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <form class="chat-in" id="chatform"><input id="chatq" placeholder="Écris ta question…" autocomplete="off"><button class="btn primary" type="submit">➤</button></form>
      <p class="tiny muted">L'IA peut se tromper : en cas de doute, le livre des règles et le Code font foi.</p></div>`;
    document.body.appendChild(m);
    const log = $("#chatlog", m), input = $("#chatq", m);
    let busy = false;
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest("[data-close]")) m.remove();
      const st = e.target.closest("[data-q]");
      if (st) send(st.dataset.q);
    });
    $("#chatform", m).addEventListener("submit", (e) => { e.preventDefault(); if (input.value.trim()) send(input.value.trim()); });
    async function send(text) {
      if (busy) return;
      if (!aiAllowed()) return;
      busy = true; input.value = "";
      $("#starters", m).innerHTML = "";
      log.insertAdjacentHTML("beforeend", `<div class="msg me"><p>${esc(text)}</p></div><div class="msg bot typing"><p>…</p></div>`);
      const out = log.lastElementChild;
      log.scrollTop = log.scrollHeight;
      S.ai.n++; S.badges.ai = S.badges.ai || now(); save(false);
      try {
        const full = await window.Cloud.ask(hist, text, (t) => { out.classList.remove("typing"); out.innerHTML = md(t); log.scrollTop = log.scrollHeight; });
        hist.push({ role: "user", text }, { role: "model", text: full });
      } catch (err) { out.classList.remove("typing"); out.innerHTML = `<p class="err-msg">${esc(err.message)}</p>`; }
      busy = false;
      input.focus();
    }
    if (first) send(first); else setTimeout(() => input.focus(), 50);
  }

  async function aiBilan(id) {
    const rec = S.exams.find((e) => e.id === id) || S.sessions.find((s) => s.id === id);
    if (!rec || !aiAllowed()) return;
    const box = $("#ai-bilan");
    box.innerHTML = `<div class="ai-answer typing"><p>Le prof IA analyse ton ${rec.kind === "exam" ? "examen" : "entraînement"}…</p></div>`;
    const items = (rec.items || []).map((l) => ({ ...l, q: qOf(l) })).filter((l) => l.q);
    const wrong = items.filter((l) => !l.ok);
    const per = {};
    items.forEach((l) => { per[l.t] = per[l.t] || [0, 0]; per[l.t][1]++; if (l.ok) per[l.t][0]++; });
    const summary = `${rec.kind === "exam" ? `Examen blanc : ${rec.score}/50 (${rec.pass ? "réussi" : "raté"}), ${rec.grave} fautes graves, ${rec.light} erreurs légères` : `Session « ${rec.title} » : ${rec.ok}/${rec.n}`}, durée ${mmss(rec.dur)}.
Résultats par thème : ${Object.entries(per).map(([t, [o, n]]) => `${TH[t].nom} ${o}/${n}`).join(", ")}.
Erreurs :
${wrong.slice(0, 20).map((l) => `- [${TH[l.t].nom}${l.g ? ", grave" : ""}] « ${l.q.q} » → répondu « ${l.sel == null ? "rien (temps écoulé)" : l.q.o[l.sel]} » au lieu de « ${l.q.o[l.q.a]} »`).join("\n") || "aucune"}
Historique : ${S.exams.slice(-5).map((e) => e.score + "/50").join(", ") || "premier examen"}. Région : ${REGIONS[S.region]}.`;
    S.ai.n++; save(false);
    const prompt = `${summary}\n\nFais un bilan pour cet élève : 1) un diagnostic en 2 phrases, 2) les 3 règles précises à revoir en priorité (explique chacune en une phrase claire, à partir de ses erreurs), 3) un plan d'entraînement pour les 7 prochains jours, 4) un mot d'encouragement. 220 mots maximum.`;
    try {
      const out = box.querySelector(".ai-answer");
      const full = await window.Cloud.ask([], prompt, (t) => { out.classList.remove("typing"); out.innerHTML = md(t); });
      rec.aiBilan = full;
      save();
      if (cloudUser()) window.Cloud.saveItem(rec.kind === "exam" ? "exams" : "sessions", rec).catch(() => {});
      box.insertAdjacentHTML("afterbegin", `<p class="tiny muted">🤖 Bilan du prof IA</p>`);
    } catch (err) { box.innerHTML = `<p class="err-msg">${esc(err.message)}</p><button class="btn full" data-act="bilan:${id}">Réessayer</button>`; }
  }

  /* ================================================================== réglages */
  function vSettings() {
    app.innerHTML = `<a class="back" href="#/">← Accueil</a><h1 class="page-h">Réglages</h1>
    <div class="card form">
      <div class="field"><span>Région de l'examen</span><div class="seg">${Object.entries(REGIONS).map(([k, v]) => `<button class="${S.region === k ? "on" : ""}" data-act="region:${k}">${v}</button>`).join("")}</div><small class="muted">Filtre les questions propres à une Région (vitesses, procédure…).</small></div>
      <div class="field"><span>Objectif quotidien</span><div class="seg">${[10, 20, 40, 80].map((v) => `<button class="${S.goal === v ? "on" : ""}" data-act="goal:${v}">${v}</button>`).join("")}</div></div>
      <div class="field"><span>Part de situations générées dans le mix</span><div class="seg">${[[0, "0 %"], [15, "15 %"], [25, "25 %"], [40, "40 %"]].map(([v, l]) => `<button class="${S.genShare === v ? "on" : ""}" data-act="genshare:${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Chrono à l'examen blanc</span><div class="seg">${[[0, "Sans"], [30, "30 s"], [15, "15 s"]].map(([v, l]) => `<button class="${S.timer === v ? "on" : ""}" data-act="timer:${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Apparence</span><div class="seg">${[["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]].map(([v, l]) => `<button class="${S.look === v ? "on" : ""}" data-act="look:${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Sons et vibrations</span><div class="seg"><button class="${S.sound ? "on" : ""}" data-act="sound:1">Oui</button><button class="${!S.sound ? "on" : ""}" data-act="sound:0">Non</button></div></div>
    </div>
    <h2>Compte et données</h2>
    <div class="card form"><a class="btn full" href="#/compte">${cloudUser() ? "☁️ Mon compte" : "☁️ Créer un compte / se connecter"}</a>
      <div class="stack-row" style="margin-top:10px"><button class="btn" data-act="export">⬇️ Exporter</button><label class="btn">⬆️ Importer<input type="file" accept="application/json" id="importf" hidden></label><button class="btn danger" data-act="reset">Tout effacer sur cet appareil</button></div></div>
    <h2>À propos</h2>
    <div class="card about"><p>${Q.length} questions rédigées, ${Object.keys(SG).length} panneaux et ${Object.keys(GEN.KINDS).length} générateurs de situations (carrefours résolus par un moteur de règles, panneaux, calculs, vitesses par Région), d'après le Code de la route belge et les nouveautés de 2026, vérifiés en novembre 2026.</p>
    <p class="tiny muted">Application d'entraînement indépendante, non officielle. Les questions de l'examen réel (GOCA, AIBV, SBAT…) ne sont pas publiques : celles-ci couvrent la même matière. Le classement « faute grave » est indicatif. Le prof IA peut se tromper. En cas de doute, la référence reste le texte légal (codedelaroute.be, Moniteur belge).</p></div>`;
    const f = $("#importf");
    f && f.addEventListener("change", () => {
      const file = f.files[0]; if (!file) return;
      file.text().then((t) => { const d = JSON.parse(t); if (!d || typeof d.q !== "object") throw new Error(); S = Object.assign(defaults(), d); save(); applyLook(); toast("Progression importée ✅"); render(); }).catch(() => toast("Fichier invalide"));
    });
  }
  function applyLook() {
    if (S.look === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", S.look);
  }

  /* ================================================================== modale & toast */
  function modal(html) {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}<button class="btn full" data-close>Fermer</button></div>`;
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.remove(); });
    document.body.appendChild(m);
  }
  // Confirmation dans la page (les boîtes confirm() natives sont bloquées dans certains affichages)
  function ask(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      const m = document.createElement("div");
      m.className = "modal";
      m.innerHTML = `<div class="modal-box" role="alertdialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="stack-row" style="justify-content:flex-end"><button class="btn ghost" data-r="0">Annuler</button><button class="btn ${danger ? "danger" : "primary"}" data-r="1">${esc(okLabel)}</button></div></div>`;
      m.addEventListener("click", (e) => { const r = e.target.closest("[data-r]"); if (r || e.target === m) { m.remove(); resolve(!!r && r.dataset.r === "1"); } });
      document.body.appendChild(m);
      m.querySelector('[data-r="1"]').focus();
    });
  }
  function toast(t) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ================================================================== actions */
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.closest(".modal.tutor")) return;
    const [act, arg] = b.dataset.act.split(/:(.*)/s);
    switch (act) {
      case "region": S.region = arg; save(); toast(`Région : ${REGIONS[arg]}`); render(); break;
      case "go": go(arg); break;
      case "mix": startSession("practice", pickMix(20), "Mix intelligent"); break;
      case "quick": startSession("practice", pickMix(10), "Session éclair"); break;
      case "unseen": startSession("practice", shuffle(pool().filter((q) => !S.q[q.id]).map((q) => q.id)).slice(0, 20), "Nouvelles questions"); break;
      case "graves": startSession("practice", shuffle(pool().filter((q) => q.g)).sort((a, b) => ((S.q[a.id] || {}).box || 0) - ((S.q[b.id] || {}).box || 0) || ageH(b.id) - ageH(a.id)).slice(0, 20).map((q) => q.id), "Fautes graves"); break;
      case "review": startSession("practice", dueIds().slice(0, 25), "Révision"); break;
      case "daily": startSession("practice", dailyIds(), "Défi du jour"); if (SES) { SES.daily = true; persistSes(); } break;
      case "gen": startSession("practice", GEN.batch(10, arg, S.region), GEN.KINDS[arg].nom); break;
      case "train": {
        const qs = pool().filter((q) => q.t === arg);
        const order = qs.map((q) => { const r = S.q[q.id]; return { id: q.id, s: (!r ? 50 : r.due <= now() ? 80 + (5 - r.box) * 5 : (5 - r.box) * 4 - (ageH(q.id) < 12 ? 30 : 0)) + Math.random() * 20 }; }).sort((a, b) => b.s - a.s);
        const kinds = GEN_THEMES[arg] || [];
        const gen = Array.from({ length: kinds.length ? 4 : 0 }, (_, i) => GEN.make(kinds[i % kinds.length], S.region));
        startSession("practice", shuffle([...order.slice(0, 15 - gen.length).map((x) => x.id), ...gen]), TH[arg].nom); break;
      }
      case "redo": startSession("practice", shuffle(arg.split(",").filter((id) => QBY[id])), "Erreurs"); break;
      case "startexam": startSession("exam", buildExam(), "Examen blanc"); break;
      case "resume": if (e.target.closest("[data-act='drop']")) break; resume(); break;
      case "drop": e.stopPropagation(); S.saved = null; save(false); render(); break;
      case "pick": pick(Number(arg)); break;
      case "confirm": examConfirm(false); break;
      case "guess": SES.guess = !SES.guess; vPlay(); break;
      case "next": next(); break;
      case "quit":
        if (SES && SES.mode === "exam" && SES.log.length && !(await ask("Quitter l'examen ?", "Tu pourras le reprendre plus tard depuis l'accueil.", "Quitter"))) return;
        if (SES && SES.mode !== "signs") persistSes();
        SES = null; go("#/"); break;
      case "spick": spick(arg); break;
      case "signquiz": {
        const keys = Object.keys(SG).map((k) => { const r = S.signs[k]; return { k, s: (!r ? 40 : r.box === 0 ? 90 : r.due <= now() ? 70 : 10 - r.box) + Math.random() * 30 }; }).sort((a, b) => b.s - a.s).slice(0, 15).map((x) => x.k);
        startSigns(shuffle(keys)); break;
      }
      case "sign": signModal(arg); break;
      case "filt": { const [id, f] = arg.split(":"); detailFilter[id] = f; vDetail(id); break; }
      case "htab": histTab = arg; vHistory(); break;
      case "timer": S.timer = Number(arg); save(); render(); break;
      case "goal": S.goal = Number(arg); save(); render(); break;
      case "genshare": S.genShare = Number(arg); save(); render(); break;
      case "look": S.look = arg; save(); applyLook(); render(); break;
      case "sound": S.sound = arg === "1"; save(); render(); break;
      case "tutor": {
        const q = qOf(SES.items[SES.i]);
        openTutor({ title: "Prof IA", context: questionContext(q, SES.sel), starters: ["Explique-moi plus simplement", "Donne-moi un exemple concret", SES.sel !== q.a ? "Pourquoi ma réponse est fausse ?" : "Quel est le piège ici ?", "Une astuce pour retenir ?"] });
        break;
      }
      case "tutorq": {
        const d = JSON.parse(decodeURIComponent(arg));
        const q = d.snap || QBY[d.id];
        if (q) openTutor({ title: "Prof IA", context: questionContext(q, d.sel), starters: ["Explique-moi plus simplement", "Donne-moi un exemple concret", "Pourquoi les autres réponses sont fausses ?"] });
        break;
      }
      case "tutor-free": {
        const c = arg && RB.find((x) => x.id === arg);
        openTutor({ title: c ? c.titre : "Prof IA", context: c ? `L'élève lit le chapitre « ${c.titre} » du livre des règles. Contenu de référence :\n${c.sections.map((s) => s.t + " : " + strip(s.html)).join("\n")}\nRégion de l'élève : ${REGIONS[S.region]}.` : `Région de l'élève : ${REGIONS[S.region]}.`, starters: c ? ["Résume-moi ce chapitre", "Quels sont les pièges classiques ?", "Pose-moi 3 questions pour vérifier"] : ["Comment se passe l'examen ?", "Explique la priorité de droite", "Quelles sont les vitesses à retenir ?"] });
        break;
      }
      case "bilan": aiBilan(arg); break;
      case "google": try { await window.Cloud.signInGoogle(); toast("Connecté ✅"); go("#/compte"); } catch (err) { if (err && err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") toast("Connexion impossible : " + (err.code || err.message)); } break;
      case "logout": await window.Cloud.signOut(); toast("Déconnecté. Ta progression reste sur cet appareil."); render(); break;
      case "syncnow": await syncDown(); toast(syncState === "ok" ? "Synchronisé ✅" : "Synchronisation impossible pour le moment"); break;
      case "wipecloud": if (await ask("Supprimer tes données du nuage ?", "Ta progression enregistrée dans ton compte sera effacée définitivement.", "Supprimer", true)) { try { await window.Cloud.wipe(); toast("Données du nuage supprimées"); } catch (err) { toast("Échec : " + err.message); } } break;
      case "export": {
        const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `permis-be-progression-${today()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000); break;
      }
      case "reset": if (await ask("Tout effacer sur cet appareil ?", "Ta progression locale sera supprimée. Ton compte en ligne n'est pas touché.", "Effacer", true)) { const r = S.region; S = defaults(); S.region = r; save(false); toast("Progression effacée"); render(); } break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (location.hash !== "#/play" || !SES || e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".modal")) return;
    const n = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
    const btns = [...app.querySelectorAll(".opt:not([disabled])")];
    if (n >= 0 && btns[n]) { btns[n].click(); e.preventDefault(); return; }
    if (e.key === "Enter") { const nx = app.querySelector('[data-act="next"]') || app.querySelector('[data-act="confirm"]:not([disabled])'); if (nx) { nx.click(); e.preventDefault(); } }
    if (e.key === "Escape") app.querySelector('[data-act="quit"]').click();
  });

  // Consulter une règle pendant une session : bouton pour reprendre.
  window.addEventListener("hashchange", () => {
    if (SES && SES.state === "done" && /^#\/(regles|fiche)\//.test(location.hash)) {
      const back = document.createElement("button");
      back.className = "resume"; back.textContent = "↩︎ Reprendre la session";
      back.onclick = () => { back.remove(); go("#/play"); };
      setTimeout(() => app.prepend(back), 0);
    }
  });
  // Synchronise avant de quitter la page
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && cloudUser() && pushTimer) { clearTimeout(pushTimer); pushTimer = null; pushState(); } });

  applyLook();
  render();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
})();
