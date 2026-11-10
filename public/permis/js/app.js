/* Permis BE — application d'entraînement à l'examen théorique (permis B).
 * 100 % locale : la progression est enregistrée dans le navigateur (localStorage). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const nav = $("#tabbar");
  const KEY = "permisbe.v1";
  const DAY = 864e5;
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // jours, système de Leitner
  const MASTER_BOX = 3;
  const REGIONS = { W: "Wallonie", B: "Bruxelles", F: "Flandre" };
  const Q = window.QUESTIONS, TH = window.THEMES, L = window.LESSONS, SG = window.SIGNS;
  const QBY = Object.fromEntries(Q.map((q) => [q.id, q]));

  /* ------------------------------------------------------------------ état */
  const defaults = () => ({ region: null, timer: 0, goal: 20, look: "auto", sound: true, q: {}, signs: {}, conf: {}, exams: [], days: {}, hist: [] });
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* stockage indisponible : on continue en mémoire */ }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const now = () => Date.now();

  const inRegion = (q) => !q.r || !S.region || q.r.includes(S.region);
  const pool = () => Q.filter(inRegion);

  function record(store, id, ok, guess) {
    const r = store[id] || { n: 0, ok: 0, ko: 0, box: 0, due: 0, last: 0 };
    r.n++; r.last = now();
    if (ok) {
      r.ok++;
      r.box = guess ? 1 : Math.min(5, r.box + 1);
      r.due = now() + INTERVALS[r.box] * DAY;
    } else {
      r.ko++; r.box = 0; r.due = now(); r.lastKo = now();
    }
    store[id] = r;
    S.days[today()] = (S.days[today()] || 0) + 1;
    S.hist.push(ok ? 1 : 0);
    if (S.hist.length > 200) S.hist = S.hist.slice(-200);
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
    const recent = S.hist.slice(-80);
    const acc = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const cover = st.seen / st.total;
    const mast = st.mastered / st.total;
    const ex = S.exams.slice(-3);
    const exam = ex.length ? ex.reduce((a, e) => a + Math.max(0, (e.score - 25) / 25), 0) / ex.length : acc * cover;
    const v = Math.round(100 * Math.min(1, 0.35 * acc * Math.sqrt(cover) + 0.3 * mast + 0.35 * exam));
    const label = v < 35 ? "Débutant·e" : v < 60 ? "En progrès" : v < 82 ? "Presque prêt·e" : "Prêt·e pour l'examen";
    return { v, label };
  }

  function insights() {
    const out = [];
    const ts = Object.keys(TH).map((t) => ({ t, ...themeStats(t) })).filter((x) => x.answers >= 6).sort((a, b) => a.acc - b.acc);
    if (ts.length && ts[0].acc < 80) out.push({ icon: "🎯", txt: `Ton point faible : <b>${TH[ts[0].t].nom}</b> (${ts[0].acc} % de bonnes réponses).`, act: `train:${ts[0].t}`, cta: "Travailler ce thème" });
    const graveKo = pool().filter((q) => q.g && S.q[q.id] && S.q[q.id].box === 0 && S.q[q.id].ko > 0).length;
    if (graveKo) out.push({ icon: "⚠️", txt: `<b>${graveKo}</b> question${graveKo > 1 ? "s" : ""} à faute grave ratée${graveKo > 1 ? "s" : ""} et pas encore corrigée${graveKo > 1 ? "s" : ""}. Chacune coûte 5 points à l'examen.`, act: "graves", cta: "Les revoir" });
    const conf = Object.entries(S.conf).sort((a, b) => b[1] - a[1])[0];
    if (conf && conf[1] >= 2) {
      const [a, b] = conf[0].split(">");
      if (SG[a] && SG[b]) out.push({ icon: "🔁", txt: `Tu confonds souvent <b>${esc(SG[a].nom)}</b> et <b>${esc(SG[b].nom)}</b>.`, html: `<div class="pair">${signTile(a)}${signTile(b)}</div>` });
    }
    const last = S.exams[S.exams.length - 1];
    if (last && !last.pass && last.grave >= 2) out.push({ icon: "💡", txt: `Ton dernier examen blanc a été raté à cause de <b>${last.grave} fautes graves</b>. Vise d'abord zéro faute grave : c'est là que tout se joue.` });
    return out;
  }

  /* ------------------------------------------------------------------ sons & vibrations */
  let actx;
  function beep(ok) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.type = "sine";
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
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = Math.random() * 0.6 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }

  /* ------------------------------------------------------------------ petits composants */
  const signTile = (k) => `<button class="sign-tile" data-act="sign:${k}" aria-label="${esc(SG[k].nom)}">${SG[k].svg()}<span>${esc(SG[k].code)}</span></button>`;
  const bar = (v, cls = "") => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
  const ring = (v, label, sub) => {
    const r = 52, c = 2 * Math.PI * r;
    return `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="ring-bg"/><circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg><div class="ring-txt"><b>${v}<small>%</small></b><span>${label}</span>${sub ? `<em>${sub}</em>` : ""}</div></div>`;
  };
  const media = (q) => (q.sc ? `<div class="media scene-wrap">${window.sceneSVG(q.sc)}</div>` : q.s ? `<div class="media sign-wrap">${SG[q.s].svg()}</div>` : "");

  function enhance(root = app) {
    root.querySelectorAll(".signrow[data-signs]").forEach((el) => { el.innerHTML = el.dataset.signs.split(",").filter((k) => SG[k]).map(signTile).join(""); });
  }

  /* ------------------------------------------------------------------ routeur */
  let timerId = null;
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  window.addEventListener("hashchange", render);

  function render() {
    clearInterval(timerId);
    const [, route = "", arg = ""] = location.hash.split("/");
    document.body.dataset.route = route || "home";
    const views = { "": vHome, train: vTrain, play: vPlay, result: vResult, exam: vExamIntro, lessons: vLessons, lesson: vLesson, signs: vSigns, stats: vStats, errors: vErrors, settings: vSettings };
    if (!S.region && route !== "settings") { document.body.dataset.route = "onboard"; app.innerHTML = vOnboard(); return; }
    (views[route] || vHome)(arg);
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#/${route}` || (route === "" && a.getAttribute("href") === "#/") || (route === "lesson" && a.getAttribute("href") === "#/lessons")));
    window.scrollTo(0, 0);
    enhance();
  }

  /* ------------------------------------------------------------------ vues */
  function vOnboard() {
    return `<section class="onboard">
      <div class="logo-big">🚗<span>🇧🇪</span></div>
      <h1>Permis B — théorie</h1>
      <p class="lead">${Q.length} questions expliquées, examens blancs au vrai barème, révision intelligente de tes erreurs. À jour avec les règles de novembre 2026.</p>
      <h2>Où passes-tu ton examen ?</h2>
      <p class="muted">Certaines règles changent selon la Région (vitesse hors agglomération, Bruxelles en zone 30, test de perception des risques en Wallonie…).</p>
      <div class="region-pick">${Object.entries(REGIONS).map(([k, v]) => `<button class="btn big" data-act="region:${k}">${v}</button>`).join("")}</div>
      <p class="tiny muted">Tu pourras changer ça dans les réglages. Ta progression reste sur cet appareil.</p>
    </section>`;
  }

  function vHome() {
    const rd = readiness(), st = themeStats(), due = dueIds().length, sk = streak();
    const done = S.days[today()] || 0;
    const ins = insights();
    const lastEx = S.exams.slice(-1)[0];
    app.innerHTML = `
    <header class="hero">
      <div class="hero-top"><div><p class="muted tiny">Permis B · ${REGIONS[S.region]}</p><h1>Salut 👋</h1></div>
        <div class="chips"><span class="chip ${sk ? "fire" : ""}" title="Jours d'affilée">🔥 ${sk} j</span><a class="chip" href="#/settings" aria-label="Réglages">⚙️</a></div></div>
      <div class="hero-main">${ring(rd.v, rd.label, "préparation")}
        <div class="hero-side">
          <div class="kpi"><b>${st.mastered}</b><span>/ ${st.total} maîtrisées</span></div>
          <div class="kpi"><b>${st.seen ? st.acc + " %" : "—"}</b><span>bonnes réponses</span></div>
          <div class="kpi"><b>${lastEx ? lastEx.score + "/50" : "—"}</b><span>dernier examen</span></div>
        </div></div>
      <div class="goal"><div class="goal-lbl"><span>Objectif du jour</span><b>${Math.min(done, S.goal)}/${S.goal}</b></div>${bar(pct(done, S.goal), done >= S.goal ? "ok" : "")}</div>
    </header>

    <div class="actions">
      <button class="action primary" data-act="mix"><span class="ai">✨</span><span><b>Continuer</b><small>Mix intelligent : erreurs à revoir, nouvelles questions, points faibles</small></span></button>
      <button class="action" data-act="go:#/exam"><span class="ai">📝</span><span><b>Examen blanc</b><small>50 questions, barème officiel (−1 / −5)</small></span></button>
      <button class="action ${due ? "warn" : ""}" data-act="review"><span class="ai">🔁</span><span><b>Révision</b><small>${due ? `${due} question${due > 1 ? "s" : ""} à revoir maintenant` : "Rien à revoir pour l'instant 👌"}</small></span></button>
    </div>

    ${ins.length ? `<section><h2>Ton coach</h2>${ins.map((i) => `<div class="insight"><span class="ii">${i.icon}</span><div><p>${i.txt}</p>${i.html || ""}${i.act ? `<button class="link" data-act="${i.act}">${i.cta} →</button>` : ""}</div></div>`).join("")}</section>` : ""}

    <section><div class="sec-h"><h2>Par thème</h2><a href="#/train" class="link">Tout voir</a></div>
      <div class="themes">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; return `<button class="theme" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="tn">${t.nom}</span>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total}${s.answers ? ` · ${s.acc} %` : ""}</small></button>`; }).join("")}</div>
    </section>

    <section class="news">
      <a href="#/lesson/nouveautes" class="news-card"><b>🆕 Nouveautés 2026</b><span>Amendes +10 %, retrait de 12 h pour l'alcool, formation dans une seule Région…</span></a>
      <a href="#/lesson/code2027" class="news-card"><b>📅 Code de la voie publique</b><span>Ce qui changera le 1er juin 2027</span></a>
    </section>`;
  }

  function vTrain() {
    const st = themeStats();
    const unseen = pool().filter((q) => !S.q[q.id]).length;
    const graves = pool().filter((q) => q.g).length;
    app.innerHTML = `<h1 class="page-h">S'entraîner</h1>
    <div class="actions">
      <button class="action primary" data-act="mix"><span class="ai">✨</span><span><b>Mix intelligent · 20</b><small>L'appli choisit pour toi</small></span></button>
      <button class="action" data-act="quick"><span class="ai">⚡</span><span><b>Session éclair · 10</b><small>5 minutes chrono</small></span></button>
      <button class="action" data-act="unseen"><span class="ai">🆕</span><span><b>Jamais vues</b><small>${unseen} question${unseen > 1 ? "s" : ""} restante${unseen > 1 ? "s" : ""}</small></span></button>
      <button class="action" data-act="graves"><span class="ai">⚠️</span><span><b>Fautes graves</b><small>Les ${graves} questions qui coûtent 5 points</small></span></button>
      <button class="action" data-act="go:#/errors"><span class="ai">📓</span><span><b>Carnet d'erreurs</b><small>${errorIds().length} question${errorIds().length > 1 ? "s" : ""} déjà ratée${errorIds().length > 1 ? "s" : ""}</small></span></button>
    </div>
    <h2>Par thème <small class="muted">· ${st.mastered}/${st.total} maîtrisées</small></h2>
    <div class="list">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; const les = L.find((l) => l.theme === k); return `<div class="row"><button class="row-main" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="grow"><b>${t.nom}</b>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total} maîtrisées${s.answers ? ` · ${s.acc} % de réussite` : ""}</small></span></button>${les ? `<a class="row-side" href="#/lesson/${les.id}" title="Fiche de cours">📖</a>` : ""}</div>`; }).join("")}</div>`;
  }

  function vExamIntro() {
    const ex = S.exams.slice(-5).reverse();
    app.innerHTML = `<h1 class="page-h">Examen blanc</h1>
    <div class="card exam-rules">
      <div class="rules-grid"><div><b>50</b><span>questions</span></div><div><b>41</b><span>pour réussir</span></div><div><b>−1</b><span>erreur</span></div><div><b>−5</b><span>faute grave</span></div></div>
      <ul><li>Comme le vrai : pas de correction pendant l'épreuve, pas de retour en arrière.</li><li><b>2 fautes graves = échec</b>, quel que soit le reste.</li><li>Correction détaillée à la fin ; tes erreurs partent en révision.</li></ul>
      <div class="field"><span>Chrono par question</span><div class="seg">${[[0, "Sans"], [30, "30 s"], [15, "15 s"]].map(([v, l]) => `<button class="${S.timer === v ? "on" : ""}" data-act="timer:${v}">${l}</button>`).join("")}</div></div>
      <button class="btn primary big full" data-act="startexam">Commencer l'examen</button>
    </div>
    ${ex.length ? `<h2>Derniers examens</h2><div class="list">${ex.map((e) => `<div class="row static"><span class="badge ${e.pass ? "ok" : "ko"}">${e.pass ? "Réussi" : "Raté"}</span><span class="grow"><b>${e.score}/50</b> <small class="muted">· ${e.grave} faute${e.grave > 1 ? "s" : ""} grave${e.grave > 1 ? "s" : ""} · ${e.light} erreur${e.light > 1 ? "s" : ""}</small></span><small class="muted">${new Date(e.d).toLocaleDateString("fr-BE")}</small></div>`).join("")}</div>` : ""}`;
  }

  /* ------------------------------------------------------------------ sessions */
  let SES = null;
  const permFor = (q) => (q.fix ? q.o.map((_, i) => i) : shuffle(q.o.map((_, i) => i)));

  function startSession(mode, ids, title) {
    if (!ids.length) { toast("Rien à réviser ici pour l'instant 👍"); return; }
    SES = { mode, title, items: ids.map((id) => ({ id, perm: permFor(QBY[id]) })), i: 0, log: [], start: now(), retried: new Set(), state: "ask", sel: null, guess: false };
    go("#/play");
  }

  function startSigns(keys) {
    const all = Object.keys(SG);
    const items = keys.map((k) => {
      const same = shuffle(all.filter((x) => x !== k && SG[x].cat === SG[k].cat && SG[x].nom !== SG[k].nom));
      const other = shuffle(all.filter((x) => x !== k && SG[x].cat !== SG[k].cat));
      const opts = shuffle([k, ...same.slice(0, 2), ...other].slice(0, 4));
      return { id: k, opts };
    });
    SES = { mode: "signs", title: "Quiz panneaux", items, i: 0, log: [], start: now(), retried: new Set(), state: "ask" };
    go("#/play");
  }

  function pickMix(n) {
    const p = pool();
    const scored = p.map((q) => {
      const r = S.q[q.id];
      let s;
      if (!r) s = 50;
      else if (r.due <= now()) s = 100 + (5 - r.box) * 12 + (r.ko > r.ok ? 20 : 0);
      else s = 5 + (r.ko > r.ok ? 25 : 0) + (5 - r.box) * 3;
      if (q.g) s += 6;
      return { id: q.id, s: s + Math.random() * 25 };
    }).sort((a, b) => b.s - a.s);
    return shuffle(scored.slice(0, n).map((x) => x.id));
  }

  function buildExam() {
    const p = shuffle(pool());
    const graves = p.filter((q) => q.g).slice(0, 15);
    const perTheme = {};
    graves.forEach((q) => (perTheme[q.t] = (perTheme[q.t] || 0) + 1));
    const rest = [];
    for (const q of p) {
      if (q.g || rest.length >= 50 - graves.length) continue;
      if ((perTheme[q.t] || 0) >= 7) continue;
      perTheme[q.t] = (perTheme[q.t] || 0) + 1;
      rest.push(q);
    }
    // complète si un thème plafonné a bloqué le remplissage
    for (const q of p) { if (graves.length + rest.length >= 50) break; if (!graves.includes(q) && !rest.includes(q)) rest.push(q); }
    return shuffle([...graves, ...rest]).slice(0, 50).map((q) => q.id);
  }

  function vPlay() {
    if (!SES) { go("#/"); return; }
    if (SES.mode === "signs") return vPlaySign();
    const it = SES.items[SES.i];
    const q = QBY[it.id];
    const exam = SES.mode === "exam";
    const answered = SES.state === "done";
    const total = SES.items.length;
    const L8 = "ABCD";
    const opts = it.perm.map((oi, k) => {
      let cls = "";
      if (answered) { if (oi === q.a) cls = "correct"; else if (oi === SES.sel) cls = "wrong"; else cls = "dim"; }
      else if (exam && SES.sel === oi) cls = "picked";
      return `<button class="opt ${cls}" data-act="pick:${oi}" ${answered ? "disabled" : ""}><span class="ol">${L8[k]}</span><span>${esc(q.o[oi])}</span></button>`;
    }).join("");
    const ok = answered && SES.sel === q.a;
    const lesson = L.find((l) => l.theme === q.t);
    app.innerHTML = `
    <div class="play">
      <div class="play-top"><button class="icon-btn" data-act="quit" aria-label="Quitter">✕</button>
        <div class="grow">${bar(pct(SES.i + (answered ? 1 : 0), total))}</div>
        <span class="counter">${SES.i + 1}/${total}</span>${exam && S.timer ? `<span class="timer" id="timer">${S.timer}</span>` : ""}</div>
      <div class="qcard ${answered ? (ok ? "is-ok" : "is-ko") : ""}">
        <div class="qmeta"><span class="chip sm">${TH[q.t].icon} ${TH[q.t].nom}</span>${!exam && q.g ? `<span class="chip sm grave" title="À l'examen, une erreur ici coûte 5 points">⚠️ Faute grave</span>` : ""}${q.r ? `<span class="chip sm">📍 ${q.r.map((r) => REGIONS[r]).join(", ")}</span>` : ""}</div>
        ${media(q)}
        <h2 class="qtext">${esc(q.q)}</h2>
        ${!exam && !answered ? `<button class="doubt ${SES.guess ? "on" : ""}" data-act="guess">🤔 ${SES.guess ? "Je doute (la question reviendra)" : "Je ne suis pas sûr·e"}</button>` : ""}
        <div class="opts">${opts}</div>
        ${exam ? `<button class="btn primary big full" data-act="confirm" ${SES.sel == null ? "disabled" : ""}>Valider</button>` : ""}
        ${answered ? `<div class="feedback">
            <p class="verdict">${ok ? (SES.guess ? "✅ Juste — mais tu doutais : on la revoit demain." : "✅ Bonne réponse !") : `❌ Raté. La bonne réponse : <b>${esc(q.o[q.a])}</b>`}</p>
            ${!ok && q.g ? `<p class="grave-note">⚠️ À l'examen, cette erreur coûterait <b>5 points</b>.</p>` : ""}
            <p class="expl">${esc(q.e)}</p>
            ${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}
            <p class="ref">${q.ref ? esc(q.ref) : ""}</p>
            ${!ok && !SES.retried.has(q.id) ? `<p class="tiny muted">🔁 Cette question reviendra à la fin de la session.</p>` : ""}
            <div class="fb-actions">${lesson ? `<a class="btn ghost" href="#/lesson/${lesson.id}" data-act="peek">📖 Fiche</a>` : ""}<button class="btn primary grow" data-act="next">${SES.i + 1 < SES.items.length ? "Suivant →" : "Voir le bilan"}</button></div>
          </div>` : ""}
      </div>
      <p class="kbd-hint tiny muted">Clavier : 1-4 pour répondre · Entrée pour continuer</p>
    </div>`;
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

  function pick(oi) {
    if (!SES || SES.state === "done") return;
    if (SES.mode === "exam") { SES.sel = oi; vPlay(); return; }
    const it = SES.items[SES.i], q = QBY[it.id];
    SES.sel = oi; SES.state = "done";
    const ok = oi === q.a;
    record(S.q, q.id, ok, SES.guess);
    SES.log.push({ id: q.id, ok, sel: oi, guess: SES.guess });
    if (!ok && !SES.retried.has(q.id)) { SES.retried.add(q.id); SES.items.push({ id: q.id, perm: permFor(q), retry: true }); }
    save(); beep(ok); vPlay();
  }

  function examConfirm(timeout) {
    if (!SES || (!timeout && SES.sel == null)) return;
    clearInterval(timerId);
    const q = QBY[SES.items[SES.i].id];
    const ok = SES.sel === q.a;
    record(S.q, q.id, ok, false);
    SES.log.push({ id: q.id, ok, sel: SES.sel, timeout: !!timeout });
    save();
    SES.sel = null;
    if (SES.i + 1 < SES.items.length) { SES.i++; vPlay(); }
    else finish();
  }

  function next() {
    if (!SES) return;
    if (SES.i + 1 < SES.items.length) { SES.i++; SES.state = "ask"; SES.sel = null; SES.guess = false; vPlay(); }
    else finish();
  }

  function finish() {
    const dur = Math.round((now() - SES.start) / 1000);
    if (SES.mode === "exam") {
      const wrong = SES.log.filter((l) => !l.ok);
      const grave = wrong.filter((l) => QBY[l.id].g).length;
      const light = wrong.length - grave;
      const score = Math.max(0, 50 - light - 5 * grave);
      const pass = score >= 41;
      SES.result = { d: now(), score, grave, light, pass, dur, wrong: wrong.map((l) => l.id) };
      S.exams.push(SES.result);
      if (S.exams.length > 50) S.exams = S.exams.slice(-50);
      save();
    }
    SES.dur = dur;
    go("#/result");
  }

  function vResult() {
    if (!SES) { go("#/"); return; }
    const isExam = SES.mode === "exam", isSigns = SES.mode === "signs";
    const first = SES.log.filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i); // 1re tentative
    const okN = first.filter((l) => l.ok).length;
    const wrong = first.filter((l) => !l.ok);
    let head;
    if (isExam) {
      const r = SES.result;
      const why = r.pass ? (r.grave ? `Réussi avec ${r.grave} faute grave — attention, c'était juste.` : "Bravo, aucune faute grave !") : r.grave >= 2 ? `Échec : ${r.grave} fautes graves (−${r.grave * 5} points à elles seules).` : `Échec : il manque ${41 - r.score} point${41 - r.score > 1 ? "s" : ""}.`;
      head = `<div class="result ${r.pass ? "pass" : "fail"}"><div class="big-score">${r.score}<small>/50</small></div><h1>${r.pass ? "Réussi 🎉" : "Pas encore…"}</h1><p>${why}</p>
        <div class="rules-grid"><div><b>${r.light}</b><span>erreur${r.light > 1 ? "s" : ""} (−1)</span></div><div><b>${r.grave}</b><span>faute${r.grave > 1 ? "s" : ""} grave${r.grave > 1 ? "s" : ""} (−5)</span></div><div><b>${Math.floor(r.dur / 60)}:${String(r.dur % 60).padStart(2, "0")}</b><span>durée</span></div></div></div>`;
      if (r.pass) setTimeout(confetti, 200);
      // détail par thème
      const per = {};
      SES.log.forEach((l) => { const t = QBY[l.id].t; per[t] = per[t] || [0, 0]; per[t][1]++; if (l.ok) per[t][0]++; });
      head += `<h2>Par thème</h2><div class="list">${Object.entries(per).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([t, [o, n]]) => `<div class="row static"><span class="ti">${TH[t].icon}</span><span class="grow"><b>${TH[t].nom}</b>${bar(pct(o, n), o === n ? "ok" : o / n < 0.7 ? "ko" : "")}</span><small>${o}/${n}</small></div>`).join("")}</div>`;
    } else {
      const p = pct(okN, first.length);
      head = `<div class="result ${p >= 82 ? "pass" : ""}"><div class="big-score">${okN}<small>/${first.length}</small></div><h1>${p >= 90 ? "Excellent ! 🔥" : p >= 75 ? "Bien joué 👍" : p >= 50 ? "Ça vient 💪" : "On continue 🧠"}</h1><p>${p} % du premier coup${SES.log.length > first.length ? ` · ${SES.log.length - first.length} question${SES.log.length - first.length > 1 ? "s" : ""} retravaillée${SES.log.length - first.length > 1 ? "s" : ""}` : ""}.</p></div>`;
    }
    let errs = "";
    if (wrong.length && !isSigns) {
      errs = `<h2>Tes erreurs à comprendre <small class="muted">(${wrong.length})</small></h2><div class="list">${wrong.map((l) => { const q = QBY[l.id]; return `<details class="err"><summary>${q.g ? "⚠️ " : ""}${esc(q.q)}</summary>${media(q)}<p><span class="badge ko">Ta réponse</span> ${l.sel == null ? "<i>pas de réponse (temps écoulé)</i>" : esc(q.o[l.sel])}</p><p><span class="badge ok">Bonne réponse</span> ${esc(q.o[q.a])}</p><p class="expl">${esc(q.e)}</p>${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}</details>`; }).join("")}</div>`;
    } else if (wrong.length && isSigns) {
      errs = `<h2>À retenir</h2><div class="list">${wrong.map((l) => `<div class="row static sign-row">${SG[l.id].svg()}<span class="grow"><b>${esc(SG[l.id].nom)}</b><small>${esc(SG[l.id].sens)}</small></span></div>`).join("")}</div>`;
    }
    const wrongIds = wrong.map((l) => l.id);
    app.innerHTML = `${head}${errs}
      <div class="stack">
        ${wrongIds.length && !isSigns ? `<button class="btn primary big full" data-act="redo:${wrongIds.join(",")}">🔁 Refaire mes erreurs maintenant</button>` : ""}
        ${isExam ? `<button class="btn big full" data-act="startexam">Nouvel examen blanc</button>` : isSigns ? `<button class="btn primary big full" data-act="signquiz">Nouveau quiz panneaux</button>` : `<button class="btn big full" data-act="mix">Session suivante</button>`}
        <a class="btn ghost full" href="#/">Accueil</a></div>`;
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
    record(S.signs, it.id, ok, false);
    if (!ok) { const key = `${it.id}>${k}`; S.conf[key] = (S.conf[key] || 0) + 1; if (!SES.retried.has(it.id)) { SES.retried.add(it.id); SES.items.push({ id: it.id, opts: shuffle(it.opts) }); } }
    SES.log.push({ id: it.id, ok, sel: k });
    save(); beep(ok); vPlaySign();
  }

  /* ------------------------------------------------------------------ cours & panneaux */
  function vLessons() {
    app.innerHTML = `<h1 class="page-h">Cours</h1><p class="muted">Des fiches courtes avec l'essentiel, les chiffres clés et les pièges. Lis la fiche, puis entraîne-toi sur le thème.</p>
    <div class="lessons">${L.map((l) => { const s = themeStats(l.theme); return `<a class="lesson-card" href="#/lesson/${l.id}"><span class="ti">${l.id === "nouveautes" ? "🆕" : l.id === "code2027" ? "📅" : l.id === "examen" ? "🎓" : TH[l.theme].icon}</span><span class="grow"><b>${l.titre}</b><small>${l.intro}</small>${["nouveautes", "code2027", "examen"].includes(l.id) ? "" : bar(pct(s.mastered, s.total))}</span></a>`; }).join("")}</div>`;
  }

  function vLesson(id) {
    const l = L.find((x) => x.id === id) || L[0];
    const s = themeStats(l.theme);
    app.innerHTML = `<a class="back" href="#/lessons">← Cours</a>
    <article class="lesson"><h1>${l.titre}</h1><p class="lead">${l.intro}</p>
      <div class="facts">${l.chiffres.map(([v, t]) => `<div><b>${v}</b><span>${t}</span></div>`).join("")}</div>
      <div class="lesson-body">${l.html}</div>
      ${l.pieges && l.pieges.length ? `<div class="traps"><h3>🪤 Les pièges</h3><ul>${l.pieges.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
      ${["nouveautes", "code2027", "examen"].includes(l.id) ? "" : `<button class="btn primary big full" data-act="train:${l.theme}">S'entraîner : ${TH[l.theme].nom} (${s.total} questions)</button>`}
    </article>`;
  }

  function vSigns() {
    const learned = Object.values(S.signs).filter((r) => r.box >= MASTER_BOX).length;
    app.innerHTML = `<h1 class="page-h">Panneaux</h1>
    <div class="actions"><button class="action primary" data-act="signquiz"><span class="ai">🛑</span><span><b>Quiz panneaux · 15</b><small>${learned}/${Object.keys(SG).length} panneaux maîtrisés · priorité à ceux que tu rates</small></span></button></div>
    ${Object.entries(window.SIGN_CATS).map(([c, nom]) => `<h2>${nom}</h2><div class="sign-grid">${Object.keys(SG).filter((k) => SG[k].cat === c).map((k) => { const r = S.signs[k]; return `<button class="sign-card ${r ? (r.box >= MASTER_BOX ? "m" : r.box === 0 ? "w" : "") : ""}" data-act="sign:${k}">${SG[k].svg()}<b>${esc(SG[k].code)}</b><small>${esc(SG[k].nom)}</small></button>`; }).join("")}</div>`).join("")}
    <p class="tiny muted">Pastille verte = maîtrisé · rouge = raté la dernière fois. Touchez un panneau pour sa signification.</p>`;
  }

  function signModal(k) {
    const sg = SG[k];
    modal(`<div class="sign-modal">${sg.svg()}<h2>${esc(sg.nom)}</h2><p class="chip sm">${esc(sg.code)} · ${window.SIGN_CATS[sg.cat]}</p><p>${esc(sg.sens)}</p></div>`);
  }

  /* ------------------------------------------------------------------ stats & carnet */
  function vStats() {
    const st = themeStats();
    const ex = S.exams.slice(-12);
    const totalAns = Object.values(S.q).reduce((a, r) => a + r.n, 0);
    const hard = pool().filter((q) => S.q[q.id] && S.q[q.id].ko > 0).sort((a, b) => S.q[b.id].ko - S.q[a.id].ko || S.q[a.id].ok - S.q[b.id].ok).slice(0, 6);
    const confs = Object.entries(S.conf).sort((a, b) => b[1] - a[1]).slice(0, 4).filter(([k]) => { const [a, b] = k.split(">"); return SG[a] && SG[b]; });
    const passRate = S.exams.length ? pct(S.exams.filter((e) => e.pass).length, S.exams.length) : null;
    // activité des 28 derniers jours
    const days = [];
    for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(S.days[today(d)] || 0); }
    const maxD = Math.max(1, ...days);
    app.innerHTML = `<h1 class="page-h">Progression</h1>
    <div class="kpis"><div class="kpi card"><b>${totalAns}</b><span>réponses</span></div><div class="kpi card"><b>${st.answers ? st.acc + " %" : "—"}</b><span>réussite</span></div><div class="kpi card"><b>${st.mastered}/${st.total}</b><span>maîtrisées</span></div><div class="kpi card"><b>${passRate == null ? "—" : passRate + " %"}</b><span>examens réussis</span></div></div>
    <h2>Activité (28 jours)</h2><div class="card"><div class="heat">${days.map((v) => `<i style="opacity:${v ? 0.25 + (0.75 * v) / maxD : 0.08}" title="${v} réponses"></i>`).join("")}</div><p class="tiny muted">🔥 Série actuelle : ${streak()} jour${streak() > 1 ? "s" : ""}</p></div>
    ${ex.length ? `<h2>Examens blancs</h2><div class="card"><div class="exam-chart">${ex.map((e) => `<div class="col ${e.pass ? "ok" : "ko"}" title="${e.score}/50"><i style="height:${(e.score / 50) * 100}%"></i><small>${e.score}</small></div>`).join("")}<div class="pass-line" style="bottom:${(41 / 50) * 100}%"><span>41</span></div></div></div>` : ""}
    <h2>Par thème</h2><div class="list">${Object.entries(TH).map(([k, t]) => { const s = themeStats(k); if (!s.total) return ""; return `<button class="row" data-act="train:${k}"><span class="ti">${t.icon}</span><span class="grow"><b>${t.nom}</b>${bar(pct(s.mastered, s.total))}<small>${s.mastered}/${s.total} maîtrisées · ${s.seen}/${s.total} vues${s.answers ? ` · ${s.acc} %` : ""}</small></span></button>`; }).join("")}</div>
    ${hard.length ? `<h2>Tes questions les plus difficiles</h2><div class="list">${hard.map((q) => `<div class="row static"><span class="badge ko">${S.q[q.id].ko}×</span><span class="grow"><small>${esc(q.q)}</small></span></div>`).join("")}</div><button class="btn full" data-act="redo:${hard.map((q) => q.id).join(",")}">Les retravailler</button>` : ""}
    ${confs.length ? `<h2>Panneaux que tu confonds</h2><div class="list">${confs.map(([k, n]) => { const [a, b] = k.split(">"); return `<div class="row static"><div class="pair">${signTile(a)}<span>≠</span>${signTile(b)}</div><small class="grow">${esc(SG[a].nom)} <i>pris pour</i> ${esc(SG[b].nom)} (${n}×)</small></div>`; }).join("")}</div>` : ""}`;
  }

  function vErrors() {
    const ids = errorIds();
    app.innerHTML = `<h1 class="page-h">Carnet d'erreurs</h1>
    <p class="muted">Toutes les questions que tu as déjà ratées, avec l'explication. Une question sort du rouge quand tu la réussis plusieurs fois, à quelques jours d'intervalle.</p>
    ${ids.length ? `<button class="btn primary big full" data-act="redo:${ids.slice(0, 30).join(",")}">🔁 Réviser ${Math.min(30, ids.length)} erreur${ids.length > 1 ? "s" : ""}</button>
    <div class="list">${ids.map((id) => { const q = QBY[id], r = S.q[id]; const st = r.box >= MASTER_BOX ? ["ok", "Corrigée"] : r.box > 0 ? ["mid", "En cours"] : ["ko", "À revoir"]; return `<details class="err"><summary><span class="badge ${st[0]}">${st[1]}</span> ${q.g ? "⚠️ " : ""}${esc(q.q)} <small class="muted">· ratée ${r.ko}×</small></summary>${media(q)}<p><span class="badge ok">Réponse</span> ${esc(q.o[q.a])}</p><p class="expl">${esc(q.e)}</p>${q.p ? `<p class="trap"><b>Le piège :</b> ${esc(q.p)}</p>` : ""}</details>`; }).join("")}</div>` : `<div class="empty">🎉<p>Aucune erreur enregistrée pour l'instant.<br>Lance une session pour commencer !</p><button class="btn primary" data-act="mix">S'entraîner</button></div>`}`;
  }

  /* ------------------------------------------------------------------ réglages */
  function vSettings() {
    app.innerHTML = `<a class="back" href="#/">← Accueil</a><h1 class="page-h">Réglages</h1>
    <div class="card form">
      <div class="field"><span>Région de l'examen</span><div class="seg">${Object.entries(REGIONS).map(([k, v]) => `<button class="${S.region === k ? "on" : ""}" data-act="region:${k}">${v}</button>`).join("")}</div><small class="muted">Filtre les questions propres à une Région (vitesses, procédure…).</small></div>
      <div class="field"><span>Objectif quotidien</span><div class="seg">${[10, 20, 40].map((v) => `<button class="${S.goal === v ? "on" : ""}" data-act="goal:${v}">${v}</button>`).join("")}</div></div>
      <div class="field"><span>Chrono à l'examen blanc</span><div class="seg">${[[0, "Sans"], [30, "30 s"], [15, "15 s"]].map(([v, l]) => `<button class="${S.timer === v ? "on" : ""}" data-act="timer:${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Apparence</span><div class="seg">${[["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]].map(([v, l]) => `<button class="${S.look === v ? "on" : ""}" data-act="look:${v}">${l}</button>`).join("")}</div></div>
      <div class="field"><span>Sons et vibrations</span><div class="seg"><button class="${S.sound ? "on" : ""}" data-act="sound:1">Oui</button><button class="${!S.sound ? "on" : ""}" data-act="sound:0">Non</button></div></div>
    </div>
    <h2>Ma progression</h2>
    <div class="card form"><p class="tiny muted">Tout est enregistré sur cet appareil, sans compte. Exporte un fichier pour la transférer sur un autre téléphone.</p>
      <div class="stack-row"><button class="btn" data-act="export">⬇️ Exporter</button><label class="btn">⬆️ Importer<input type="file" accept="application/json" id="importf" hidden></label><button class="btn danger" data-act="reset">Tout effacer</button></div></div>
    <h2>À propos</h2>
    <div class="card about"><p>${Q.length} questions et ${Object.keys(SG).length} panneaux, rédigés d'après le Code de la route belge et les nouveautés de 2026 (SPF Police, Régions), vérifiés en novembre 2026.</p>
    <p class="tiny muted">Application d'entraînement indépendante, non officielle. Les questions de l'examen réel (GOCA, AIBV, SBAT…) ne sont pas publiques : celles-ci sont rédigées pour couvrir la même matière. Le classement « faute grave » est indicatif. En cas de doute, la référence reste le texte légal (codedelaroute.be, Moniteur belge).</p></div>`;
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

  /* ------------------------------------------------------------------ modale & toast */
  function modal(html) {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}<button class="btn full" data-close>Fermer</button></div>`;
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.remove(); });
    document.body.appendChild(m);
  }
  function toast(t) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ------------------------------------------------------------------ actions */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const [act, arg] = b.dataset.act.split(/:(.*)/s);
    switch (act) {
      case "region": S.region = arg; save(); toast(`Région : ${REGIONS[arg]}`); render(); break;
      case "go": go(arg); break;
      case "mix": startSession("practice", pickMix(20), "Mix intelligent"); break;
      case "quick": startSession("practice", pickMix(10), "Session éclair"); break;
      case "unseen": startSession("practice", shuffle(pool().filter((q) => !S.q[q.id]).map((q) => q.id)).slice(0, 20), "Nouvelles questions"); break;
      case "graves": startSession("practice", shuffle(pool().filter((q) => q.g)).sort((a, b) => ((S.q[a.id] || {}).box || 0) - ((S.q[b.id] || {}).box || 0)).slice(0, 20).map((q) => q.id), "Fautes graves"); break;
      case "review": startSession("practice", dueIds().slice(0, 25), "Révision"); break;
      case "train": {
        const qs = pool().filter((q) => q.t === arg);
        const order = qs.map((q) => { const r = S.q[q.id]; return { id: q.id, s: (!r ? 50 : r.due <= now() ? 80 + (5 - r.box) * 5 : (5 - r.box) * 4) + Math.random() * 20 }; }).sort((a, b) => b.s - a.s);
        startSession("practice", shuffle(order.slice(0, 15).map((x) => x.id)), TH[arg].nom); break;
      }
      case "redo": startSession("practice", shuffle(arg.split(",").filter((id) => QBY[id])), "Erreurs"); break;
      case "startexam": startSession("exam", buildExam(), "Examen blanc"); break;
      case "pick": pick(Number(arg)); break;
      case "confirm": examConfirm(false); break;
      case "guess": SES.guess = !SES.guess; vPlay(); break;
      case "next": next(); break;
      case "peek": break; // lien normal vers la fiche (la session reste en mémoire)
      case "quit":
        if (SES && SES.mode === "exam" && SES.log.length && !confirm("Abandonner l'examen ? Il ne sera pas comptabilisé.")) return;
        SES = null; go("#/"); break;
      case "spick": spick(arg); break;
      case "signquiz": {
        const keys = Object.keys(SG).map((k) => { const r = S.signs[k]; return { k, s: (!r ? 40 : r.box === 0 ? 90 : r.due <= now() ? 70 : 10 - r.box) + Math.random() * 30 }; }).sort((a, b) => b.s - a.s).slice(0, 15).map((x) => x.k);
        startSigns(shuffle(keys)); break;
      }
      case "sign": signModal(arg); break;
      case "timer": S.timer = Number(arg); save(); render(); break;
      case "goal": S.goal = Number(arg); save(); render(); break;
      case "look": S.look = arg; save(); applyLook(); render(); break;
      case "sound": S.sound = arg === "1"; save(); render(); break;
      case "export": {
        const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `permis-be-progression-${today()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000); break;
      }
      case "reset": if (confirm("Effacer toute ta progression ? C'est définitif.")) { const r = S.region; S = defaults(); S.region = r; save(); toast("Progression effacée"); render(); } break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (location.hash !== "#/play" || !SES || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
    const btns = [...app.querySelectorAll(".opt:not([disabled])")];
    if (n >= 0 && btns[n]) { btns[n].click(); e.preventDefault(); return; }
    if (e.key === "Enter") {
      const nx = app.querySelector('[data-act="next"]') || app.querySelector('[data-act="confirm"]:not([disabled])');
      if (nx) { nx.click(); e.preventDefault(); }
    }
    if (e.key === "Escape") app.querySelector('[data-act="quit"]').click();
  });

  // Retour d'une fiche consultée pendant une session : on reprend où on en était.
  window.addEventListener("hashchange", () => {
    if (SES && location.hash.startsWith("#/lesson/")) {
      const back = document.createElement("button");
      back.className = "resume"; back.textContent = "↩︎ Reprendre la session";
      back.onclick = () => { back.remove(); go("#/play"); };
      setTimeout(() => app.prepend(back), 0);
    }
  });

  applyLook();
  render();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
  }
})();
