/* Perception des risques (entraînement au TPR) : scènes animées vues du dessus.
 * Le candidat touche « Danger » dès qu'un danger se concrétise. Note de 0 à 5 selon la rapidité
 * dans la fenêtre de danger ; cliquer en rafale donne 0 (comme à l'examen). */
(function () {
  const EGO_X = 212, EGO_SY = 390; // position fixe de « ta » voiture à l'écran
  const ROAD = { L: 110, R: 282, C: 178 }; // bords de chaussée et ligne médiane
  const C = { car1: "#3c8dde", car2: "#9aa3ad", car3: "#26a269", car4: "#8e5bd0", car5: "#d98c2b", red: "#e8553f" };

  /* ---------- dessins (orientés vers le haut, centrés sur 0,0) ---------- */
  const D = {
    car: (c) => `<rect x="-12" y="-22" width="24" height="44" rx="7" fill="${c}" stroke="#1d2430" stroke-width="1.5"/><rect x="-9" y="-14" width="18" height="9" rx="2" fill="#dfe8f0"/><rect x="-9" y="9" width="18" height="6" rx="2" fill="#c9d4de"/>`,
    truck: (c) => `<rect x="-16" y="-44" width="32" height="88" rx="4" fill="${c}" stroke="#1d2430" stroke-width="1.5"/><rect x="-14" y="-42" width="28" height="18" rx="3" fill="#5b6574"/>`,
    bus: () => `<rect x="-17" y="-58" width="34" height="116" rx="6" fill="#f2c037" stroke="#1d2430" stroke-width="1.5"/><rect x="-14" y="-54" width="28" height="10" rx="2" fill="#dfe8f0"/>`,
    bike: (c) => `<rect x="-2" y="-14" width="4" height="28" rx="2" fill="#222"/><ellipse cx="0" cy="0" rx="8" ry="5" fill="${c}"/><circle cx="0" cy="-2" r="4" fill="#f1c9a5"/>`,
    ped: (c) => `<g transform="scale(1.45)"><ellipse cx="0" cy="0" rx="8" ry="5" fill="${c}" stroke="#1d2430" stroke-width=".8"/><circle cx="0" cy="0" r="4.5" fill="#6b4a2b"/></g>`,
    child: (c) => `<g transform="scale(1.45)"><ellipse cx="0" cy="0" rx="6" ry="4" fill="${c}" stroke="#1d2430" stroke-width=".8"/><circle cx="0" cy="0" r="3.5" fill="#e0b080"/></g>`,
    ball: () => `<circle r="7" fill="#fff" stroke="#e8553f" stroke-width="3"/>`,
    deer: () => `<ellipse cx="0" cy="0" rx="7" ry="16" fill="#8a5a2b"/><circle cx="0" cy="-17" r="5" fill="#8a5a2b"/><path d="M-3 -21 l-4 -6 M3 -21 l4 -6" stroke="#5a3a1b" stroke-width="2"/>`,
    tree: () => `<circle r="16" fill="#2f7d3a"/><circle r="9" cx="-4" cy="-4" fill="#3d9a4a"/>`,
    house: () => `<rect x="-24" y="-20" width="48" height="40" fill="#c9b8a6" stroke="#8a7a69"/><path d="M-24 -20 L0 -32 L24 -20" fill="#a55" />`,
    door: () => `<rect x="-2" y="0" width="4" height="22" rx="1" fill="#1d2430"/>`,
  };

  /* ---------- scénarios ---------- */
  // at : [[t, x, wy, r?], ...] positions dans le monde (wy croît vers l'avant). r : 0 = vers l'avant.
  const parkedRow = (from, to, step, cols) => { const out = []; let i = 0; for (let y = from; y <= to; y += step) out.push({ k: "car", x: 266, y, c: cols[i++ % cols.length] }); return out; };
  const SCENES = [
    { id: "ballon", titre: "Rue résidentielle", zone: "Zone 30", v: 70, brake: [6.1, 1.3], dur: 9, win: [3.6, 5.6],
      objs: [...parkedRow(300, 760, 62, [C.car2, C.car4, C.car5, C.car3]).filter((o) => o.y !== 548), { k: "ball", at: [[3.4, 296, 545], [5.2, 140, 548]] }, { k: "child", c: "#e8553f", r: -90, at: [[4.3, 300, 548], [6.4, 205, 548], [9, 205, 548]] }, { k: "house", x: 330, y: 420 }, { k: "house", x: 330, y: 620 }, { k: "house", x: 30, y: 500 }],
      why: "Le ballon qui roule entre deux voitures garées annonce presque toujours un enfant qui court derrière. Le bon moment pour réagir : dès que le ballon apparaît, en ralentissant et en te préparant à freiner." },
    { id: "portiere", titre: "Voitures garées", zone: "Agglomération · 50 km/h", v: 85, brake: [5.6, 1.2], dur: 9, win: [4.0, 5.6],
      objs: [...parkedRow(260, 820, 70, [C.car2, C.car5, C.car3]).filter((o) => o.y !== 610), { k: "car", x: 266, y: 610, c: C.car4, head: true }, { k: "door", x: 253, y: 622, at: [[0, 253, 622, 0], [4.2, 253, 622, 0], [4.8, 253, 622, 80], [9, 253, 622, 80]] }, { k: "house", x: 330, y: 500 }, { k: "house", x: 30, y: 640 }],
      why: "Une tête visible dans une voiture garée = une portière peut s'ouvrir. Garde une distance latérale suffisante et ralentis : la portière s'ouvre ici dans ta trajectoire." },
    { id: "demarre", titre: "Voiture qui démarre", zone: "Agglomération · 50 km/h", v: 85, brake: [5.6, 1.3], dur: 8.5, win: [3.2, 5.2],
      objs: [...parkedRow(240, 820, 74, [C.car2, C.car3, C.car5]).filter((o) => o.y !== 610), { k: "car", c: C.car1, blink: { from: 2.6, side: "L" }, at: [[0, 266, 610, 0], [3.8, 266, 610, 0], [5, 236, 660, -18], [6, 214, 720, 0], [8.5, 214, 860, 0]] }, { k: "house", x: 330, y: 420 }, { k: "house", x: 30, y: 560 }],
      why: "Le clignotant gauche d'une voiture garée et ses roues braquées annoncent qu'elle va s'insérer, parfois sans te voir. Ralentis dès que le clignotant s'allume." },
    { id: "bus", titre: "Bus à l'arrêt", zone: "Agglomération · 50 km/h", v: 80, brake: [6.3, 1.2], dur: 9.5, win: [4.6, 6.4],
      objs: [{ k: "bus", x: 262, y: 640 }, { k: "zebra", y: 718 }, { k: "ped", c: "#3c8dde", r: -90, at: [[4.6, 268, 712], [7.5, 150, 718], [9.5, 120, 718]] }, { k: "ped", c: "#26a269", x: 296, y: 600 }, { k: "ped", c: "#e8553f", x: 300, y: 660 }, { k: "house", x: 330, y: 760 }, { k: "house", x: 30, y: 620 }],
      why: "Un bus arrêté près d'un passage pour piétons cache les gens qui traversent devant lui. Ici un piéton surgit devant le bus : il fallait anticiper en ralentissant avant de le dépasser." },
    { id: "cycliste", titre: "Cycliste et obstacle", zone: "Agglomération · 50 km/h", v: 80, brake: [6.4, 1.6], dur: 9.5, win: [4.4, 6.2],
      objs: [{ k: "bike", c: "#e8553f", at: [[0, 240, 400], [4.2, 240, 560], [5.6, 214, 620], [9.5, 214, 800]] }, { k: "car", x: 266, y: 640, c: C.car2 }, { k: "car", x: 266, y: 710, c: C.car5 }, { k: "car", c: C.car3, r: 180, at: [[0, 145, 1100], [9.5, 145, 300]] }, { k: "house", x: 330, y: 620 }],
      why: "Le cycliste va devoir contourner la voiture garée devant lui et se déporter dans ta bande, alors qu'une voiture arrive en face. Anticipe : ralentis et reste derrière lui (1 m minimum en agglomération pour dépasser)." },
    { id: "carrefour", titre: "Carrefour sans panneau", zone: "Agglomération · priorité de droite", v: 80, brake: [4.4, 1.4], dur: 8.5, win: [3.0, 5.0],
      objs: [{ k: "cross", y: 520 }, { k: "car", c: C.red, r: -90, at: [[0, 470, 555], [2.6, 340, 555], [5.4, 215, 555], [8.5, -80, 555]] }, { k: "house", x: 330, y: 380 }, { k: "house", x: 30, y: 380 }, { k: "house", x: 330, y: 680 }],
      why: "Carrefour sans signalisation : la voiture qui arrive de ta droite est prioritaire. Le danger apparaît dès qu'elle approche du carrefour : tu dois ralentir et lui céder le passage." },
    { id: "camion", titre: "Camion qui freine", zone: "Hors agglomération · 90 km/h", v: 95, brake: [5.4, 1.6], dur: 8.5, win: [3.6, 5.2], rural: true,
      objs: [{ k: "truck", c: "#7b8796", brakeAt: 3.6, at: [[0, 212, 200], [3.6, 212, 542], [6, 212, 660], [8.5, 212, 680]] }, { k: "tree", x: 40, y: 500 }, { k: "tree", x: 330, y: 640 }, { k: "tree", x: 40, y: 820 }, { k: "car", c: C.car4, r: 180, at: [[0, 145, 1300], [8.5, 145, 300]] }],
      why: "Les feux stop du camion s'allument : il freine fort et tu ne vois pas ce qu'il y a devant lui. C'est le moment de réagir. Une distance de 2 secondes t'aurait laissé de la marge." },
    { id: "chevreuil", titre: "Route de campagne", zone: "Hors agglomération · lisière de bois", v: 95, brake: [5.7, 1.4], dur: 9, win: [4.2, 5.8], rural: true,
      objs: [{ k: "tree", x: 40, y: 560 }, { k: "tree", x: 60, y: 640 }, { k: "tree", x: 35, y: 720 }, { k: "tree", x: 55, y: 800 }, { k: "tree", x: 330, y: 600 }, { k: "tree", x: 320, y: 760 }, { k: "deer", r: 90, at: [[4.0, 60, 680], [6.3, 300, 680], [9, 360, 680]] }],
      why: "En lisière de bois, surtout à l'aube et au crépuscule, un animal peut surgir. Freine en ligne droite plutôt que de faire un écart, et attention : d'autres animaux peuvent suivre." },
    { id: "trottinette", titre: "Trottinette sur le trottoir", zone: "Agglomération · 50 km/h", v: 80, brake: [5.8, 1.2], dur: 8.5, win: [3.8, 5.6],
      objs: [{ k: "bike", c: "#26a269", at: [[0, 296, 380], [3.6, 296, 560], [5.2, 230, 610], [8.5, 140, 630]] }, { k: "zebra", y: 630 }, { k: "car", x: 266, y: 470, c: C.car2 }, { k: "car", x: 266, y: 530, c: C.car5 }, { k: "house", x: 330, y: 820 }, { k: "house", x: 30, y: 700 }],
      why: "Une trottinette électrique roule vite sur le trottoir et s'engage sur le passage sans ralentir. Les usagers d'engins de déplacement peuvent surgir plus vite qu'un piéton : anticipe dès que tu la vois approcher du passage." },
    { id: "ecole", titre: "Sortie d'école", zone: "Zone 30 abords d'école", v: 60, brake: [5.6, 1.3], dur: 8.5, win: [3.4, 5.4],
      objs: [{ k: "zebra", y: 480 }, { k: "ped", c: "#f2c037", x: 300, y: 440 }, { k: "child", c: "#8e5bd0", x: 292, y: 458 }, { k: "child", c: "#3c8dde", r: -90, at: [[3.2, 296, 486], [5.8, 150, 486], [8.5, 120, 486]] }, { k: "child", c: "#e8553f", x: 92, y: 540 }, { k: "house", x: 330, y: 700 }, { k: "house", x: 30, y: 560 }],
      why: "Près d'une école, un enfant peut traverser en courant, sans regarder, pour rejoindre quelqu'un de l'autre côté. Ralentis encore sous les 30 km/h et sois prêt à t'arrêter." },
  ];

  /* ---------- moteur ---------- */
  const lerp = (a, b, k) => a + (b - a) * k;
  function pos(o, t) {
    if (!o.at) return { x: o.x, y: o.y, r: o.r || 0 };
    const a = o.at;
    if (t <= a[0][0]) return { x: a[0][1], y: a[0][2], r: a[0][3] != null ? a[0][3] : o.r || 0, hidden: t < a[0][0] - 0.001 && o.k !== "car" && o.k !== "truck" && o.k !== "bike" && o.k !== "door" };
    for (let i = 1; i < a.length; i++) {
      if (t <= a[i][0]) {
        const k = (t - a[i - 1][0]) / (a[i][0] - a[i - 1][0]);
        return { x: lerp(a[i - 1][1], a[i][1], k), y: lerp(a[i - 1][2], a[i][2], k), r: lerp(a[i - 1][3] != null ? a[i - 1][3] : o.r || 0, a[i][3] != null ? a[i][3] : o.r || 0, k) };
      }
    }
    const l = a[a.length - 1];
    return { x: l[1], y: l[2], r: l[3] != null ? l[3] : o.r || 0 };
  }
  function egoY(sc, t) {
    const [tb, db] = sc.brake, v = sc.v;
    if (t <= tb) return v * t;
    const dt = Math.min(t - tb, db);
    return v * tb + v * dt - (v / db) * dt * dt / 2;
  }

  function scenery(sc) {
    const len = 2400;
    let s = "";
    const grass = sc.rural ? "#9cc489" : "#b7c9a8";
    s += `<rect x="-20" y="${-len}" width="400" height="${len + 600}" fill="${grass}"/>`;
    if (!sc.rural) s += `<rect x="80" y="${-len}" width="30" height="${len + 600}" fill="#d9d4cc"/><rect x="282" y="${-len}" width="30" height="${len + 600}" fill="#d9d4cc"/>`;
    s += `<rect x="${ROAD.L}" y="${-len}" width="${ROAD.R - ROAD.L}" height="${len + 600}" fill="#5b6270"/>`;
    s += `<line x1="${ROAD.C}" y1="${-len}" x2="${ROAD.C}" y2="600" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/>`;
    sc.objs.forEach((o) => {
      if (o.k === "cross") s += `<rect x="-20" y="${-(o.y + 70)}" width="400" height="140" fill="#5b6270"/><line x1="-20" y1="${-o.y}" x2="${ROAD.L}" y2="${-o.y}" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/><line x1="${ROAD.R}" y1="${-o.y}" x2="380" y2="${-o.y}" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/>`;
      if (o.k === "zebra") for (let x = ROAD.L + 6; x < ROAD.R - 10; x += 16) s += `<rect x="${x}" y="${-(o.y + 12)}" width="9" height="24" fill="#f4f4f4"/>`;
    });
    return s;
  }

  function play(host, sc, onDone) {
    host.innerHTML = `<div class="tpr">
      <div class="tpr-hud"><span class="chip sm">${sc.zone}</span><span class="tpr-clock" id="tclock">0,0 s</span></div>
      <svg class="tpr-svg" viewBox="0 0 360 480" role="img" aria-label="Scène de circulation animée">
        <g id="tworld">${scenery(sc)}</g>
        <g id="tobjs"></g>
        <g transform="translate(${EGO_X} ${EGO_SY})">${D.car("#1d4f9c")}<rect x="-9" y="-14" width="18" height="9" rx="2" fill="#dfe8f0"/></g>
        <g id="tflash"></g>
      </svg>
      <div class="tpr-bar"><i id="tprog"></i><span id="tmarks"></span></div>
      <button class="btn danger-btn big full" id="tbtn">⚠️ Danger !</button>
      <p class="tiny muted">Touche le bouton (ou l'image, ou la barre d'espace) dès qu'un danger se concrétise.</p></div>`;
    const world = host.querySelector("#tworld"), objs = host.querySelector("#tobjs"), prog = host.querySelector("#tprog"), marks = host.querySelector("#tmarks"), clock = host.querySelector("#tclock"), flash = host.querySelector("#tflash");
    const els = sc.objs.filter((o) => D[o.k]).map((o) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      let inner = D[o.k](o.c);
      if (o.head) inner += `<circle cx="-4" cy="-2" r="4" fill="#6b4a2b"/>`;
      if (o.blink) inner += `<circle class="blink" cx="${o.blink.side === "L" ? -11 : 11}" cy="-20" r="3.5" fill="#f08a00" opacity="0"/><circle class="blink" cx="${o.blink.side === "L" ? -11 : 11}" cy="20" r="3.5" fill="#f08a00" opacity="0"/>`;
      if (o.brakeAt != null) inner += `<rect class="stop" x="-14" y="${o.k === "truck" ? 41 : 19}" width="7" height="4" fill="#ff2a2a" opacity="0"/><rect class="stop" x="7" y="${o.k === "truck" ? 41 : 19}" width="7" height="4" fill="#ff2a2a" opacity="0"/>`;
      g.innerHTML = inner;
      objs.appendChild(g);
      return { o, g };
    });
    const clicks = [];
    let t0 = null, raf, done = false;
    function frame(ts) {
      if (t0 == null) t0 = ts;
      const t = (ts - t0) / 1000;
      const ey = egoY(sc, t);
      const oy = EGO_SY + ey;
      world.setAttribute("transform", `translate(0 ${oy})`);
      els.forEach(({ o, g }) => {
        const p = pos(o, t);
        g.style.display = p.hidden ? "none" : "";
        g.setAttribute("transform", `translate(${p.x} ${oy - p.y}) rotate(${p.r})`);
        if (o.blink) g.querySelectorAll(".blink").forEach((b) => b.setAttribute("opacity", t >= o.blink.from && Math.floor(t * 2.5) % 2 === 0 ? 1 : 0));
        if (o.brakeAt != null) g.querySelectorAll(".stop").forEach((b) => b.setAttribute("opacity", t >= o.brakeAt ? 1 : 0));
      });
      prog.style.width = Math.min(100, (t / sc.dur) * 100) + "%";
      clock.textContent = t.toFixed(1).replace(".", ",") + " s";
      if (t >= sc.dur) return finish();
      raf = requestAnimationFrame(frame);
    }
    function hit() {
      if (done || t0 == null) return;
      const t = (performance.now() - t0) / 1000;
      clicks.push(t);
      marks.insertAdjacentHTML("beforeend", `<b style="left:${(t / sc.dur) * 100}%"></b>`);
      flash.innerHTML = `<rect width="360" height="480" fill="#f6c700" opacity=".25"><animate attributeName="opacity" from=".35" to="0" dur=".35s" fill="freeze"/></rect>`;
      if (navigator.vibrate) navigator.vibrate(25);
    }
    const key = (e) => { if (e.code === "Space") { e.preventDefault(); hit(); } };
    host.querySelector("#tbtn").addEventListener("click", hit);
    host.querySelector(".tpr-svg").addEventListener("pointerdown", hit);
    document.addEventListener("keydown", key);
    function finish() {
      done = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", key);
      onDone(score(sc, clicks), clicks);
    }
    raf = requestAnimationFrame(frame);
    return () => { done = true; cancelAnimationFrame(raf); document.removeEventListener("keydown", key); };
  }

  function score(sc, clicks) {
    if (clicks.length > 6) return { pts: 0, why: "Trop de clics : cliquer en rafale est pénalisé (0 point)." };
    const [a, b] = sc.win;
    const inWin = clicks.find((c) => c >= a && c <= b);
    if (inWin == null) {
      const early = clicks.some((c) => c < a);
      return { pts: 0, why: clicks.length ? (early ? "Trop tôt : le danger ne s'était pas encore concrétisé." : "Trop tard : le danger était déjà là.") : "Aucun clic : le danger n'a pas été signalé." };
    }
    const pts = Math.max(1, 5 - Math.floor(((inWin - a) / (b - a)) * 5));
    return { pts, why: pts >= 4 ? "Excellente anticipation !" : pts >= 2 ? "Bien vu, mais tu peux réagir plus tôt." : "De justesse : réagis dès les premiers indices." };
  }

  window.TPR = { SCENES, play, _pos: pos, _egoY: egoY };
})();
