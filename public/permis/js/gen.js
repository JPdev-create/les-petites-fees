/* Générateurs de questions : des situations toujours nouvelles, calculées par un moteur de règles.
 * Chaque générateur renvoie un objet au format des questions (avec un id unique « g:<type>:<n> »). */
(function () {
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let seq = 0;
  const uid = (k) => `g:${k}:${Date.now().toString(36)}${(seq++).toString(36)}`;

  /* ================= Moteur de priorité =================
   * Bras : S, W, N, E. Mouvements : straight, left, right.
   * Droite de chaque bras (pour un véhicule qui en vient) : S→E, E→N, N→W, W→S. */
  const RIGHT = { S: "E", E: "N", N: "W", W: "S" };
  const OPP = { S: "N", N: "S", E: "W", W: "E" };
  const LEFT = { S: "W", W: "N", N: "E", E: "S" };
  const dest = (c) => (c.go === "straight" ? OPP[c.from] : c.go === "right" ? RIGHT[c.from] : LEFT[c.from]);
  const GO_TXT = { straight: "va tout droit", left: "tourne à gauche", right: "tourne à droite" };

  function conflict(x, y) {
    if (x.go === "right" || y.go === "right") return dest(x) === dest(y);
    if (OPP[x.from] === y.from) return (x.go === "left") !== (y.go === "left"); // un seul tourne à gauche
    return true; // trajectoires perpendiculaires tout droit / à gauche : elles se coupent
  }
  // niveau : 2 = route prioritaire (B9), 1 = route ordinaire (pas de panneau), 0 = B1/B5
  const level = (sc, arm) => { const s = (sc.signs || {})[arm]; return s === "B9" ? 2 : s === "B1" || s === "B5" ? 0 : 1; };

  // Renvoie null si x n'a pas à céder à y, sinon la raison.
  function yieldReason(sc, x, y) {
    if (!conflict(x, y)) return null;
    const lx = level(sc, x.from), ly = level(sc, y.from);
    if (lx < ly) return (sc.signs || {})[x.from] === "B5" ? "stop" : "cedez";
    if (lx > ly) return null;
    if (OPP[x.from] === y.from) return x.go === "left" ? "gauche" : null;
    return RIGHT[x.from] === y.from ? "droite" : null;
  }

  function solveOrder(sc) {
    let rest = sc.cars.slice();
    const order = [];
    while (rest.length) {
      const free = rest.filter((x) => !rest.some((y) => y !== x && yieldReason(sc, x, y)));
      if (free.length !== 1) return null; // ambigu (passages simultanés) ou blocage
      order.push(free[0]);
      rest = rest.filter((c) => c !== free[0]);
    }
    return order;
  }

  const REASON_TXT = {
    droite: (x, y) => `${x.id} doit céder le passage à ${y.id}, qui vient de sa droite`,
    gauche: (x, y) => `${x.id} tourne à gauche et doit céder le passage à ${y.id} qui arrive en sens inverse`,
    cedez: (x, y) => `${x.id} a un « cédez le passage » (B1) : il cède à ${y.id}`,
    stop: (x, y) => `${x.id} a un STOP : il s'arrête et cède à ${y.id}`,
  };

  const COLORS = ["#e8553f", "#3c8dde", "#26a269", "#9b59b6"];
  function genPriority() {
    for (let tries = 0; tries < 200; tries++) {
      const tee = Math.random() < 0.25;
      const arms = tee ? shuffle(["N", "S", "E", "W"]).slice(0, 3) : ["N", "S", "E", "W"];
      const mode = pick(["none", "none", "axis", "axis", "cedez"]);
      const signs = {};
      if (mode === "axis") {
        const axis = pick([["N", "S"], ["E", "W"]]);
        arms.forEach((a) => (signs[a] = axis.includes(a) ? "B9" : Math.random() < 0.3 ? "B5" : "B1"));
        if (!axis.every((a) => arms.includes(a))) continue; // la route prioritaire doit traverser le carrefour
      } else if (mode === "cedez") {
        const a = pick(arms); signs[a] = Math.random() < 0.35 ? "B5" : "B1";
      }
      const n = Math.random() < 0.55 ? 2 : 3;
      const from = shuffle(arms).slice(0, n);
      const cars = from.map((f, i) => {
        const moves = ["straight", "left", "right"].filter((m) => arms.includes(dest({ from: f, go: m })));
        return { id: "ABCD"[i], from: f, go: pick(moves), color: COLORS[i] };
      });
      // éviter deux tourne-à-gauche face à face (règle de croisement non tranchée par l'examen)
      if (cars.some((x) => cars.some((y) => x !== y && OPP[x.from] === y.from && x.go === "left" && y.go === "left"))) continue;
      // au moins un conflit réel
      if (!cars.some((x) => cars.some((y) => x !== y && conflict(x, y)))) continue;
      const sc = { arms, cars, signs };
      const order = solveOrder(sc);
      if (!order) continue;
      // explication
      const lines = [];
      cars.forEach((x) => cars.forEach((y) => { const r = x !== y && yieldReason(sc, x, y); if (r) lines.push(REASON_TXT[r](x, y)); }));
      const desc = cars.map((c) => `${c.id} ${GO_TXT[c.go]}`).join(", ");
      const ctx = mode === "none" ? "Carrefour sans signalisation : priorité de droite (et celui qui tourne à gauche cède à ceux d'en face)." : mode === "axis" ? "La route avec le losange jaune (B9) est prioritaire ; les autres ont un cédez-le-passage ou un STOP." : "Un seul accès a un panneau : ce conducteur cède à tous, les autres appliquent la priorité de droite.";
      const base = { t: "priorite", g: true, sc, gen: "prio", ref: "Art. 12 et 19 du Code de la route" };
      const orderTxt = order.map((c) => c.id).join(", puis ");
      if (n === 2 || Math.random() < 0.5) {
        const opts = cars.map((c) => c.id).sort();
        return { ...base, id: uid("prio"), q: `${desc}. Qui passe en premier ?`, o: opts, a: opts.indexOf(order[0].id), fix: true,
          e: `${ctx} ${lines.length ? lines.join(" ; ") + "." : ""} ${order[0].id} passe donc en premier${n > 2 ? ` (ordre complet : ${orderTxt})` : ""}.` };
      }
      // question sur l'ordre complet
      const right = order.map((c) => c.id).join(", ");
      const perms = [];
      const ids = cars.map((c) => c.id);
      const permute = (arr, pre = []) => { if (!arr.length) perms.push(pre.join(", ")); arr.forEach((v, i) => permute(arr.filter((_, j) => j !== i), [...pre, v])); };
      permute(ids);
      const wrong = shuffle(perms.filter((p) => p !== right)).slice(0, 3);
      const opts = shuffle([right, ...wrong]);
      return { ...base, id: uid("prio"), q: `${desc}. Dans quel ordre passent-ils ?`, o: opts, a: opts.indexOf(right), fix: true,
        e: `${ctx} ${lines.join(" ; ")}. Ordre : ${orderTxt}.`, p: "Méthode : cherche celui qui ne doit céder à personne, fais-le passer, puis recommence avec les véhicules restants." };
    }
    return null;
  }

  /* ================= Panneaux ================= */
  function genSignName() {
    const S = window.SIGNS, keys = Object.keys(S);
    const k = pick(keys), sg = S[k];
    const same = shuffle(keys.filter((x) => x !== k && S[x].cat === sg.cat && S[x].nom !== sg.nom));
    const other = shuffle(keys.filter((x) => S[x].cat !== sg.cat));
    const opts = shuffle([k, ...same.slice(0, 2), ...other].slice(0, 4));
    return { id: uid("sign"), gen: "sign", t: "panneaux", s: k, q: "Que signifie ce panneau ?", o: opts.map((x) => S[x].nom), a: opts.indexOf(k), fix: true, e: `${sg.code} — ${sg.sens}`, ref: sg.code, signKey: k };
  }
  function genSignPick() {
    const S = window.SIGNS, keys = Object.keys(S);
    const k = pick(keys), sg = S[k];
    const same = shuffle(keys.filter((x) => x !== k && S[x].cat === sg.cat && S[x].nom !== sg.nom));
    const other = shuffle(keys.filter((x) => S[x].cat !== sg.cat && x !== k));
    const opts = shuffle([k, ...same.slice(0, 3), ...other].slice(0, 4));
    return { id: uid("signpick"), gen: "signpick", t: "panneaux", q: `Quel panneau signifie : « ${sg.nom} » ?`, o: opts.map((x) => `${S[x].code} — ${S[x].nom}`), oh: opts.map((x) => S[x].svg()), keys: opts, a: opts.indexOf(k), fix: true, e: `C'est le ${sg.code}. ${sg.sens}`, ref: sg.code, signKey: k };
  }

  /* ================= Calculs ================= */
  const fmt = (n) => String(Math.round(n));
  function distractors(right, spread) {
    const set = new Set([right]);
    let guard = 0;
    while (set.size < 4 && guard++ < 50) { const d = right + (rnd(2) ? 1 : -1) * spread * (1 + rnd(3)); if (d > 0) set.add(Math.round(d)); }
    return shuffle([...set]);
  }
  function genReaction() {
    const v = pick([30, 50, 70, 80, 90, 100, 120]);
    const t = pick([1, 1, 1, 2]);
    const d = Math.round((v / 3.6) * t);
    const opts = distractors(d, Math.max(5, Math.round(d * 0.35)));
    return { id: uid("react"), gen: "calc", t: "conduite", q: `Vous roulez à ${v} km/h. Votre temps de réaction est de ${t} seconde${t > 1 ? "s" : ""}${t > 1 ? " (fatigue, distraction)" : ""}. Quelle distance parcourez-vous avant même de commencer à freiner ?`, o: opts.map((x) => `Environ ${x} m`), a: opts.indexOf(d), fix: true, e: `${v} km/h ÷ 3,6 = ${(v / 3.6).toFixed(1).replace(".", ",")} m/s ; × ${t} s ≈ ${d} m. Le temps de réaction double avec la fatigue, l'alcool ou le téléphone.`, ref: "Conduite défensive" };
  }
  function genTwoSec() {
    const v = pick([50, 70, 90, 100, 120]);
    const d = Math.round((v / 3.6) * 2);
    const opts = distractors(d, Math.max(8, Math.round(d * 0.3)));
    return { id: uid("2s"), gen: "calc", t: "conduite", q: `À ${v} km/h, quelle distance correspond à la règle des 2 secondes ?`, o: opts.map((x) => `Environ ${x} m`), a: opts.indexOf(d), fix: true, e: `${v} ÷ 3,6 × 2 ≈ ${d} m. Par temps de pluie, on double cette distance.`, ref: "Art. 18" };
  }
  function genBraking() {
    const [a, b] = pick([[50, 100], [30, 60], [40, 80], [60, 90], [50, 70], [90, 120], [30, 50]]);
    const f = (b / a) ** 2;
    const right = f.toFixed(1).replace(".", ",").replace(",0", "");
    const opts = shuffle([...new Set([right, (b / a).toFixed(1).replace(".", ",").replace(",0", ""), (f * 1.5).toFixed(1).replace(".", ",").replace(",0", ""), "Identique"])]);
    return { id: uid("brake"), gen: "calc", t: "vitesse", q: `En passant de ${a} à ${b} km/h, par combien est multipliée la distance de freinage ?`, o: opts.map((x) => (x === "Identique" ? x : `× ${x}`)), a: opts.indexOf(right), fix: true, e: `La distance de freinage varie avec le carré de la vitesse : (${b} ÷ ${a})² ≈ ${right}.`, ref: "Physique du freinage" };
  }
  function genScore() {
    const g = pick([0, 0, 1, 1, 1, 2]);
    const l = rnd(g === 0 ? 13 : g === 1 ? 8 : 3);
    const score = 50 - l - 5 * g;
    const pass = score >= 41;
    const opts = [`Réussi (${score}/50)`, `Échec (${score}/50)`];
    return { id: uid("score"), gen: "calc", t: "permis", q: `À l'examen théorique, un candidat fait ${g} faute${g > 1 ? "s" : ""} grave${g > 1 ? "s" : ""} et ${l} erreur${l > 1 ? "s" : ""} légère${l > 1 ? "s" : ""}. Résultat ?`, o: opts, a: pass ? 0 : 1, fix: true, e: `50 − ${l} × 1 − ${g} × 5 = ${score}/50. Il faut au moins 41/50.${g >= 2 ? " Deux fautes graves suffisent à échouer." : ""}`, ref: "Barème de l'examen" };
  }

  /* ================= Vitesses selon l'endroit et la Région ================= */
  function genSpeed(region) {
    const R = region || pick(["W", "B", "F"]);
    const RN = { W: "en Wallonie", B: "à Bruxelles", F: "en Flandre" }[R];
    const places = [
      ["dans une agglomération (panneau F1), rue sans autre panneau", R === "B" ? 30 : 50],
      ["sur une autoroute, sans panneau particulier", 120],
      ["dans une zone 30 (panneau F4a)", 30],
      ["dans une zone résidentielle (panneau F12a)", 20],
      ["dans une rue cyclable (panneau F111)", 30],
    ];
    if (R !== "B") places.push(["hors agglomération, sur une route ordinaire à une bande par sens", R === "W" ? 90 : 70]);
    const [lieu, v] = pick(places);
    const opts = shuffle([...new Set([v, ...shuffle([20, 30, 50, 70, 90, 120].filter((x) => x !== v)).slice(0, 3)])]);
    return { id: uid("speed"), gen: "speed", t: "vitesse", g: true, q: `${RN[0].toUpperCase() + RN.slice(1)}, ${lieu} : quelle est la vitesse maximale ?`, o: opts.map((x) => `${x} km/h`), a: opts.indexOf(v), fix: true, e: `${RN[0].toUpperCase() + RN.slice(1)}, ${lieu} : ${v} km/h maximum. ${R === "F" ? "Rappel : 70 km/h par défaut hors agglomération en Flandre." : R === "B" ? "Rappel : Bruxelles est en « Ville 30 » par défaut." : "Rappel : 90 km/h hors agglomération en Wallonie."}`, ref: "Art. 11 et zones", r: [R] };
  }

  const KINDS = {
    prio: { nom: "Carrefours générés", w: 4, make: genPriority },
    sign: { nom: "Panneaux → sens", w: 2, make: genSignName },
    signpick: { nom: "Sens → panneau", w: 2, make: genSignPick },
    react: { nom: "Distance de réaction", w: 1, make: genReaction },
    twosec: { nom: "Règle des 2 secondes", w: 1, make: genTwoSec },
    brake: { nom: "Distance de freinage", w: 1, make: genBraking },
    score: { nom: "Barème de l'examen", w: 1, make: genScore },
    speed: { nom: "Vitesse selon l'endroit", w: 1, make: genSpeed },
  };

  window.GEN = {
    KINDS,
    make(kind, region) {
      if (!kind) {
        const tot = Object.values(KINDS).reduce((a, k) => a + k.w, 0);
        let r = Math.random() * tot;
        for (const [k, v] of Object.entries(KINDS)) { r -= v.w; if (r <= 0) { kind = k; break; } }
      }
      return KINDS[kind].make(region) || genSignName();
    },
    batch(n, kind, region) { const out = []; for (let i = 0; i < n; i++) out.push(this.make(kind, region)); return out; },
    _solve: solveOrder, _yield: yieldReason,
  };
})();
