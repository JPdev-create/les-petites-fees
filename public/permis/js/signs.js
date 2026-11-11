/* Panneaux routiers belges dessinés en SVG (aucune image externe).
 * Chaque panneau : { code, nom, cat, sens } + svg() → chaîne SVG (viewBox 0 0 100 100). */
(function () {
  const RED = "#c8102e", BLUE = "#1d4f9c", YEL = "#f6c700", BLK = "#111", WH = "#fff";

  // Place un glyphe (dessiné sur une grille 100×100) au centre (cx, cy) avec l'échelle s.
  const at = (g, cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-50 -50)">${g}</g>`;
  const wrap = (body) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;

  /* ---------- Formes ---------- */
  const tri = (g) => wrap(`<polygon points="50,9 93,86 7,86" fill="${WH}" stroke="${RED}" stroke-width="9" stroke-linejoin="round"/>${at(g, 50, 61, 0.42)}`);
  const triInv = (g = "") => wrap(`<polygon points="7,14 93,14 50,91" fill="${WH}" stroke="${RED}" stroke-width="9" stroke-linejoin="round"/>${g}`);
  const circRed = (g) => wrap(`<circle cx="50" cy="50" r="42" fill="${WH}" stroke="${RED}" stroke-width="11"/>${at(g, 50, 50, 0.62)}`);
  const circBlue = (g) => wrap(`<circle cx="50" cy="50" r="46" fill="${BLUE}" stroke="${WH}" stroke-width="2"/>${at(g, 50, 50, 0.68)}`);
  const circEnd = (g) => wrap(`<circle cx="50" cy="50" r="45" fill="${WH}" stroke="#888" stroke-width="2"/>${at(g, 50, 50, 0.62)}<line x1="20" y1="80" x2="80" y2="20" stroke="${BLK}" stroke-width="6"/><line x1="26" y1="84" x2="84" y2="26" stroke="${BLK}" stroke-width="2"/><line x1="16" y1="74" x2="74" y2="16" stroke="${BLK}" stroke-width="2"/>`);
  const square = (g, bg = BLUE) => wrap(`<rect x="5" y="5" width="90" height="90" rx="9" fill="${bg}" stroke="${WH}" stroke-width="2"/>${g}`);
  const squareW = (g) => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${g}`);

  /* ---------- Glyphes (grille 100×100) ---------- */
  const G = {
    excl: (c = BLK) => `<rect x="43" y="10" width="14" height="56" rx="6" fill="${c}"/><circle cx="50" cy="84" r="8" fill="${c}"/>`,
    up: (c = WH) => `<path d="M50 8 L80 42 H60 V92 H40 V42 H20 Z" fill="${c}"/>`,
    right: (c = WH) => `<path d="M30 92 V48 Q30 34 44 34 H66 V18 L92 44 L66 70 V54 H50 V92 Z" fill="${c}"/>`,
    roundabout: (c = WH) => `<g fill="none" stroke="${c}" stroke-width="9"><path d="M50 16 A34 34 0 0 1 84 50"/><path d="M84 50 A34 34 0 0 1 50 84" transform="rotate(120 50 50)"/><path d="M84 50 A34 34 0 0 1 50 84" transform="rotate(240 50 50)"/></g><g fill="${c}"><polygon points="84,62 96,44 72,44" transform="rotate(0 50 50)"/><polygon points="84,62 96,44 72,44" transform="rotate(120 50 50)"/><polygon points="84,62 96,44 72,44" transform="rotate(240 50 50)"/></g>`,
    curveL: (c = BLK) => `<path d="M62 94 V60 Q62 40 40 30 L40 16 L14 36 L40 56 L40 44 Q50 48 50 62 V94 Z" fill="${c}"/>`,
    curveR: (c = BLK) => `<g transform="translate(100 0) scale(-1 1)">${G.curveL(c)}</g>`,
    narrow: (c = BLK) => `<path d="M22 94 L36 54 L36 6 M78 94 L64 54 L64 6" fill="none" stroke="${c}" stroke-width="9"/>`,
    twoWay: (c = BLK) => `<path d="M34 8 L52 32 H40 V92 H28 V32 H16 Z" fill="${c}"/><path d="M66 92 L48 68 H60 V8 H72 V68 H84 Z" fill="${c}"/>`,
    bump: (c = BLK) => `<path d="M4 80 H24 Q50 30 76 80 H96 V90 H4 Z" fill="${c}"/>`,
    slip: (c = BLK) => `<rect x="30" y="14" width="40" height="30" rx="8" fill="${c}"/><circle cx="36" cy="46" r="6" fill="${c}"/><circle cx="64" cy="46" r="6" fill="${c}"/><path d="M30 64 q8 10 0 20 M50 60 q8 12 0 26 M70 64 q8 10 0 20" fill="none" stroke="${c}" stroke-width="6"/>`,
    lights: () => `<rect x="34" y="4" width="32" height="92" rx="10" fill="${BLK}"/><circle cx="50" cy="22" r="10" fill="${RED}"/><circle cx="50" cy="50" r="10" fill="${YEL}"/><circle cx="50" cy="78" r="10" fill="#1aa64b"/>`,
    ped: (c = BLK) => `<circle cx="52" cy="12" r="9" fill="${c}"/><path d="M50 24 L42 54 L30 92 M44 48 L60 92 M46 30 L28 50 M50 30 L70 46" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`,
    pedCross: (c = BLK) => `${at(G.ped(c), 50, 42, 0.8)}<path d="M8 90 H92" stroke="${c}" stroke-width="6" stroke-dasharray="10 6"/>`,
    kids: (c = BLK) => `${at(G.ped(c), 34, 48, 0.85)}${at(G.ped(c), 70, 58, 0.66)}`,
    bike: (c = BLK) => `<g fill="none" stroke="${c}" stroke-width="6"><circle cx="24" cy="66" r="18"/><circle cx="78" cy="66" r="18"/><path d="M24 66 L42 36 H70 L78 66 M42 36 L54 66 L70 36 M38 26 H50 M66 26 L70 36" stroke-linejoin="round"/></g>`,
    carSide: (c = BLK) => `<path d="M8 62 Q8 48 20 46 L32 30 Q36 26 44 26 H64 Q70 26 74 32 L84 46 Q94 48 94 60 V70 H8 Z" fill="${c}"/><circle cx="28" cy="72" r="10" fill="${c}" stroke="${WH}" stroke-width="3"/><circle cx="74" cy="72" r="10" fill="${c}" stroke="${WH}" stroke-width="3"/>`,
    carTop: (c = BLK) => `<rect x="34" y="8" width="32" height="84" rx="10" fill="${c}"/><rect x="38" y="24" width="24" height="14" rx="3" fill="${WH}" opacity=".8"/>`,
    truck: (c = BLK) => `<rect x="6" y="22" width="58" height="44" fill="${c}"/><path d="M66 36 H82 L94 52 V66 H66 Z" fill="${c}"/><circle cx="24" cy="72" r="9" fill="${c}"/><circle cx="80" cy="72" r="9" fill="${c}"/>`,
    tram: (c = BLK) => `<path d="M50 6 V18 M38 6 H62" stroke="${c}" stroke-width="5"/><rect x="18" y="18" width="64" height="60" rx="10" fill="${c}"/><rect x="26" y="26" width="48" height="20" rx="3" fill="${WH}"/><circle cx="34" cy="64" r="5" fill="${WH}"/><circle cx="66" cy="64" r="5" fill="${WH}"/><path d="M28 78 L20 94 M72 78 L80 94" stroke="${c}" stroke-width="5"/>`,
    train: (c = BLK) => `<rect x="10" y="30" width="50" height="40" fill="${c}"/><rect x="58" y="16" width="30" height="54" fill="${c}"/><rect x="16" y="14" width="12" height="18" fill="${c}"/><circle cx="24" cy="78" r="10" fill="${c}"/><circle cx="50" cy="78" r="10" fill="${c}"/><circle cx="76" cy="78" r="10" fill="${c}"/>`,
    barrier: (c = BLK) => `<path d="M10 40 H90 M10 64 H90" stroke="${c}" stroke-width="10"/><path d="M18 26 V82 M50 26 V82 M82 26 V82" stroke="${c}" stroke-width="8"/>`,
    works: (c = BLK) => `<circle cx="44" cy="16" r="9" fill="${c}"/><path d="M42 28 L36 60 L24 92 M38 54 L52 92 M40 34 L64 52" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><path d="M64 52 L80 86" stroke="${c}" stroke-width="5"/><path d="M60 92 L84 72 L96 92 Z" fill="${c}"/>`,
    xLines: (c = BLK) => `<path d="M14 14 L86 86 M86 14 L14 86" stroke="${c}" stroke-width="14" stroke-linecap="round"/>`,
    priorityCross: (c = BLK) => `<rect x="40" y="4" width="20" height="92" fill="${c}"/><rect x="10" y="45" width="80" height="10" fill="${c}"/>`,
    num: (n, c = BLK, size = 52) => `<text x="50" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="${c}">${n}</text>`,
    uturn: (c = BLK) => `<path d="M30 94 V44 Q30 18 52 18 Q74 18 74 44 V60 H88 L68 86 L48 60 H62 V44 Q62 32 52 32 Q42 32 42 44 V94 Z" fill="${c}"/>`,
    turnLeft: (c = BLK) => `<g transform="translate(100 0) scale(-1 1)">${G.right(c)}</g>`,
    house: (c = WH) => `<path d="M10 52 L34 30 L58 52 V80 H10 Z" fill="${c}"/>`,
  };

  /* ---------- Catalogue ---------- */
  const S = {};
  const add = (key, code, nom, cat, sens, svg) => (S[key] = { key, code, nom, cat, sens, svg });

  // A — Danger
  add("A1a", "A1a", "Virage dangereux à gauche", "danger", "Annonce un virage dangereux vers la gauche, en général à 150 m (hors agglomération).", () => tri(G.curveL()));
  add("A1b", "A1b", "Virage dangereux à droite", "danger", "Annonce un virage dangereux vers la droite.", () => tri(G.curveR()));
  add("A7a", "A7a", "Chaussée rétrécie", "danger", "La chaussée se rétrécit des deux côtés : on ralentit et on reste bien à droite.", () => tri(G.narrow()));
  add("A14", "A14", "Dos d'âne / ralentisseur", "danger", "Annonce un ralentisseur ou une bosse : on adapte sa vitesse.", () => tri(G.bump()));
  add("A15", "A15", "Chaussée glissante", "danger", "Risque de dérapage : pluie, verglas, boue… On ralentit et on évite les freinages brusques.", () => tri(G.slip()));
  add("A21", "A21", "Passage pour piétons", "danger", "Annonce un passage pour piétons : on ralentit et on se prépare à s'arrêter.", () => tri(G.pedCross()));
  add("A23", "A23", "Endroit fréquenté par des enfants", "danger", "École, plaine de jeux… Prudence : un enfant peut surgir. Souvent combiné avec une zone 30.", () => tri(G.kids()));
  add("A25", "A25", "Passage de cyclistes", "danger", "Des cyclistes peuvent traverser ou déboucher sur la chaussée.", () => tri(G.bike()));
  add("A31", "A31", "Travaux", "danger", "Chantier sur la route : ralentir, ouvriers et engins possibles.", () => tri(G.works()));
  add("A33", "A33", "Signaux lumineux", "danger", "Annonce des feux de signalisation, parfois cachés après un virage.", () => tri(G.lights()));
  add("A39", "A39", "Circulation dans les deux sens", "danger", "Après une portion à sens unique, la circulation redevient à double sens.", () => tri(G.twoWay()));
  add("A41", "A41", "Passage à niveau avec barrières", "danger", "Passage à niveau muni de barrières ou de demi-barrières.", () => tri(G.barrier()));
  add("A43", "A43", "Passage à niveau sans barrières", "danger", "Passage à niveau SANS barrières : regarder, écouter, être prêt à s'arrêter.", () => tri(G.train()));
  add("A51", "A51", "Danger (autre)", "danger", "Danger non représenté par un autre panneau ; un panneau additionnel en précise souvent la nature.", () => tri(G.excl()));

  // B — Priorité
  add("B1", "B1", "Cédez le passage", "priorite", "Vous devez céder le passage aux conducteurs qui circulent sur la route que vous allez aborder, dans les deux sens.", () => triInv());
  add("B5", "B5", "Stop", "priorite", "Arrêt OBLIGATOIRE à la ligne d'arrêt (ou au bord de la chaussée), puis céder le passage dans les deux sens.", () => wrap(`<polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="${RED}" stroke="${WH}" stroke-width="4"/><text x="50" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="28" text-anchor="middle" dominant-baseline="central" fill="${WH}">STOP</text>`));
  add("B9", "B9", "Route prioritaire", "priorite", "Vous êtes sur une route prioritaire : les usagers venant des routes latérales doivent vous céder le passage à chaque carrefour.", () => wrap(`<rect x="18" y="18" width="64" height="64" transform="rotate(45 50 50)" fill="${WH}" stroke="${BLK}" stroke-width="1.5"/><rect x="29" y="29" width="42" height="42" transform="rotate(45 50 50)" fill="${YEL}"/>`));
  add("B11", "B11", "Fin de route prioritaire", "priorite", "Fin du caractère prioritaire : la priorité de droite s'applique de nouveau (sauf autre signal).", () => wrap(`<rect x="18" y="18" width="64" height="64" transform="rotate(45 50 50)" fill="${WH}" stroke="${BLK}" stroke-width="1.5"/><rect x="29" y="29" width="42" height="42" transform="rotate(45 50 50)" fill="${YEL}"/><path d="M24 76 L76 24" stroke="${BLK}" stroke-width="7"/><path d="M30 82 L82 30 M18 70 L70 18" stroke="${BLK}" stroke-width="2.5"/>`));
  add("B15", "B15", "Priorité au prochain carrefour", "priorite", "Au PROCHAIN carrefour seulement, vous avez la priorité sur les usagers venant des routes latérales.", () => tri(G.priorityCross()));
  add("B17", "B17", "Carrefour à priorité de droite", "priorite", "Annonce un carrefour où la règle générale de la priorité de droite s'applique.", () => tri(G.xLines()));
  add("B19", "B19", "Céder le passage aux conducteurs venant en sens inverse", "priorite", "Passage étroit : vous devez laisser passer ceux qui arrivent en face (flèche rouge = vous).", () => circRed(`<path d="M30 92 V30 H18 L34 8 L50 30 H38 V92 Z" fill="${RED}"/><path d="M70 8 V70 H82 L66 92 L50 70 H62 V8 Z" fill="${BLK}"/>`));
  add("B21", "B21", "Priorité par rapport aux conducteurs venant en sens inverse", "priorite", "Passage étroit : vous passez en premier (flèche blanche = vous), ceux d'en face attendent.", () => square(`<path d="M32 86 V36 H22 L36 16 L50 36 H40 V86 Z" fill="${WH}"/><path d="M66 16 V66 H76 L62 86 L48 66 H58 V16 Z" fill="${RED}"/>`));

  // C — Interdiction
  add("C1", "C1", "Sens interdit", "interdiction", "Accès interdit à tout conducteur dans ce sens (sauf exception indiquée, ex. cyclistes avec panneau M).", () => wrap(`<circle cx="50" cy="50" r="46" fill="${RED}"/><rect x="18" y="41" width="64" height="18" fill="${WH}"/>`));
  add("C3", "C3", "Accès interdit dans les deux sens", "interdiction", "Interdit à tout conducteur, dans les deux sens (piétons autorisés). Un panneau additionnel peut prévoir des exceptions (riverains, rue scolaire…).", () => circRed(""));
  add("C11", "C11", "Accès interdit aux cyclistes", "interdiction", "Les cyclistes ne peuvent pas emprunter cette voie.", () => circRed(G.bike()));
  add("C19", "C19", "Accès interdit aux piétons", "interdiction", "Les piétons ne peuvent pas emprunter cette voie.", () => circRed(G.ped()));
  add("C31a", "C31a", "Interdiction de tourner à gauche", "interdiction", "Interdit de tourner à gauche au prochain carrefour.", () => circRed(`${G.turnLeft(BLK)}<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="9"/>`));
  add("C31b", "C31b", "Interdiction de tourner à droite", "interdiction", "Interdit de tourner à droite au prochain carrefour.", () => circRed(`${G.right(BLK)}<line x1="14" y1="14" x2="86" y2="86" stroke="${RED}" stroke-width="9"/>`));
  add("C33", "C33", "Demi-tour interdit", "interdiction", "Interdit de faire demi-tour jusqu'au prochain carrefour inclus.", () => circRed(`${G.uturn(BLK)}<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="9"/>`));
  add("C35", "C35", "Dépassement interdit", "interdiction", "Interdit de dépasser un véhicule à plus de deux roues par la gauche. Dépasser un vélo ou une moto reste permis.", () => circRed(`${at(G.carTop(RED), 34, 50, 0.9)}${at(G.carTop(BLK), 66, 50, 0.9)}`));
  add("C37", "C37", "Fin de l'interdiction de dépasser", "interdiction", "Fin de l'interdiction de dépasser imposée par le C35.", () => circEnd(`${at(G.carTop("#777"), 34, 50, 0.9)}${at(G.carTop("#777"), 66, 50, 0.9)}`));
  add("C43_30", "C43", "Vitesse maximale 30 km/h", "interdiction", "Interdit de dépasser 30 km/h jusqu'au prochain carrefour (ou jusqu'au panneau de fin, s'il est répété).", () => circRed(G.num(30)));
  add("C43_50", "C43", "Vitesse maximale 50 km/h", "interdiction", "Interdit de dépasser 50 km/h.", () => circRed(G.num(50)));
  add("C43_70", "C43", "Vitesse maximale 70 km/h", "interdiction", "Interdit de dépasser 70 km/h.", () => circRed(G.num(70)));
  add("C43_90", "C43", "Vitesse maximale 90 km/h", "interdiction", "Interdit de dépasser 90 km/h.", () => circRed(G.num(90)));
  add("C45_70", "C45", "Fin de la limitation à 70 km/h", "interdiction", "Fin de la limitation : la vitesse générale de l'endroit s'applique de nouveau.", () => circEnd(G.num(70, "#777")));
  add("C46", "C46", "Fin de toutes les interdictions locales", "interdiction", "Fin de toutes les interdictions locales signalées pour les véhicules en mouvement (vitesse, dépassement…).", () => circEnd(""));

  // D — Obligation
  add("D1", "D1", "Direction obligatoire", "obligation", "Obligation de suivre la direction de la flèche (ou de contourner l'obstacle du côté indiqué).", () => circBlue(G.up()));
  add("D1r", "D1", "Direction obligatoire : à droite", "obligation", "Obligation de tourner / suivre la direction à droite.", () => circBlue(G.right()));
  add("D5", "D5", "Carrefour giratoire", "obligation", "Rond-point : sens giratoire obligatoire. Combiné au B1, ceux qui sont sur l'anneau ont la priorité.", () => circBlue(`<g transform="translate(100 0) scale(-1 1)">${G.roundabout()}</g>`));
  add("D7", "D7", "Piste cyclable obligatoire", "obligation", "Piste réservée aux cyclistes (et cyclomoteurs classe A, trottinettes électriques) ; les cyclistes sont tenus de l'emprunter.", () => circBlue(G.bike(WH)));
  add("D9", "D9", "Chemin réservé aux piétons et cyclistes", "obligation", "Partie réservée aux piétons et aux cyclistes (côte à côte ou séparés selon le dessin).", () => circBlue(`${at(G.ped(WH), 50, 30, 0.42)}<line x1="14" y1="52" x2="86" y2="52" stroke="${WH}" stroke-width="4"/>${at(G.bike(WH), 50, 72, 0.42)}`));

  // E — Arrêt et stationnement
  add("E1", "E1", "Stationnement interdit", "stationnement", "Stationnement interdit (l'arrêt reste permis) du côté où se trouve le panneau.", () => wrap(`<circle cx="50" cy="50" r="42" fill="${BLUE}" stroke="${RED}" stroke-width="11"/><line x1="22" y1="22" x2="78" y2="78" stroke="${RED}" stroke-width="11"/>`));
  add("E3", "E3", "Arrêt et stationnement interdits", "stationnement", "Interdit de s'arrêter ET de stationner du côté du panneau.", () => wrap(`<circle cx="50" cy="50" r="42" fill="${BLUE}" stroke="${RED}" stroke-width="11"/><line x1="22" y1="22" x2="78" y2="78" stroke="${RED}" stroke-width="11"/><line x1="78" y1="22" x2="22" y2="78" stroke="${RED}" stroke-width="11"/>`));
  add("E9a", "E9a", "Parking (stationnement autorisé)", "stationnement", "Stationnement autorisé. Un panneau additionnel peut le limiter (disque, durée, catégorie).", () => square(G.num("P", WH, 72)));
  add("E9a_disque", "E9a + disque", "Zone bleue / disque de stationnement", "stationnement", "Stationnement autorisé avec le disque bleu, en principe pour 2 h maximum (du lundi au samedi, 9 h-18 h sauf indication).", () => wrap(`<rect x="5" y="5" width="90" height="90" rx="9" fill="${BLUE}"/>${G.num("P", WH, 52).replace('y="52"', 'y="34"')}<rect x="22" y="58" width="56" height="30" rx="4" fill="${WH}"/><circle cx="50" cy="73" r="10" fill="none" stroke="${BLUE}" stroke-width="3"/><path d="M50 73 V66 M50 73 H56" stroke="${BLUE}" stroke-width="3"/>`));

  // F — Indication
  add("F1", "F1", "Début d'agglomération", "indication", "Début d'une agglomération : 50 km/h (30 km/h à Bruxelles, sauf indication) et règles d'agglomération à partir du panneau.", () => wrap(`<rect x="3" y="22" width="94" height="56" rx="4" fill="${WH}" stroke="${BLK}" stroke-width="3"/><text x="50" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="17" text-anchor="middle" dominant-baseline="central" fill="${BLK}">MARCHE</text>`));
  add("F3", "F3", "Fin d'agglomération", "indication", "Fin de l'agglomération : retour à la vitesse hors agglomération (90 km/h en Wallonie, 70 km/h en Flandre sauf indication).", () => wrap(`<rect x="3" y="22" width="94" height="56" rx="4" fill="${WH}" stroke="${BLK}" stroke-width="3"/><text x="50" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="17" text-anchor="middle" dominant-baseline="central" fill="${BLK}">MARCHE</text><line x1="8" y1="74" x2="92" y2="26" stroke="${RED}" stroke-width="6"/>`));
  add("F4a", "F4a", "Début de zone 30", "indication", "Début d'une zone où la vitesse est limitée à 30 km/h, jusqu'au panneau de fin de zone (F4b).", () => wrap(`<rect x="12" y="4" width="76" height="92" rx="6" fill="${WH}" stroke="${BLK}" stroke-width="2"/><circle cx="50" cy="38" r="26" fill="${WH}" stroke="${RED}" stroke-width="7"/>${at(G.num(30), 50, 38, 0.55)}<text x="50" y="80" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="18" text-anchor="middle" fill="${BLK}">ZONE</text>`));
  add("F4b", "F4b", "Fin de zone 30", "indication", "Fin de la zone 30 : la vitesse générale s'applique de nouveau.", () => wrap(`<rect x="12" y="4" width="76" height="92" rx="6" fill="${WH}" stroke="${BLK}" stroke-width="2"/><circle cx="50" cy="38" r="26" fill="${WH}" stroke="#888" stroke-width="5"/>${at(G.num(30, "#777"), 50, 38, 0.55)}<text x="50" y="80" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="18" text-anchor="middle" fill="#777">ZONE</text><line x1="18" y1="90" x2="82" y2="10" stroke="${BLK}" stroke-width="5"/>`));
  add("F5", "F5", "Autoroute", "indication", "Début d'une autoroute : 120 km/h max, 70 km/h min (code actuel), règles spécifiques (pas de demi-tour, pas de marche arrière…).", () => square(`<path d="M30 90 L44 50 M70 90 L56 50" stroke="${WH}" stroke-width="7"/><path d="M50 90 V78 M50 70 V62" stroke="${WH}" stroke-width="4"/><path d="M18 46 Q50 28 82 46 V54 H18 Z" fill="${WH}"/>`));
  add("F7", "F7", "Fin d'autoroute", "indication", "Fin de l'autoroute : les règles générales reprennent.", () => square(`<path d="M30 90 L44 50 M70 90 L56 50" stroke="${WH}" stroke-width="7"/><path d="M18 46 Q50 28 82 46 V54 H18 Z" fill="${WH}"/><line x1="12" y1="88" x2="88" y2="12" stroke="${RED}" stroke-width="7"/>`));
  add("F9", "F9", "Route pour automobiles", "indication", "Route réservée aux véhicules automobiles ; mêmes interdictions qu'une autoroute pour s'y arrêter, faire demi-tour…", () => square(at(G.carSide(WH), 50, 52, 0.8)));
  add("F12a", "F12a", "Zone résidentielle / de rencontre", "indication", "Piétons partout sur la voie, jeux autorisés, 20 km/h max, stationnement uniquement aux endroits marqués « P ».", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.house(BLUE), 34, 44, 0.6)}${at(G.ped(BLUE), 62, 46, 0.42)}${at(G.carSide(BLUE), 56, 76, 0.32)}<circle cx="78" cy="58" r="4" fill="${BLUE}"/>`));
  add("F19", "F19", "Voie publique à sens unique", "indication", "Vous circulez dans une rue à sens unique (dans le sens de la flèche).", () => square(G.up(WH).replace('<path', '<path transform="translate(50 50) scale(.75) translate(-50 -50)"')));
  add("F45", "F45", "Voie sans issue", "indication", "Impasse : la route n'a pas d'issue pour les véhicules.", () => square(`<rect x="44" y="34" width="12" height="56" fill="${WH}"/><rect x="24" y="18" width="52" height="16" fill="${RED}"/>`));
  add("F49", "F49", "Passage pour piétons", "indication", "Indique l'emplacement d'un passage pour piétons.", () => square(`<polygon points="50,14 88,84 12,84" fill="${WH}"/>${at(G.ped(BLK), 52, 60, 0.38)}`));
  add("F87", "F87", "Ralentisseur de trafic", "indication", "Indique un dispositif surélevé (ralentisseur).", () => square(`<path d="M14 72 H30 Q50 36 70 72 H86 V80 H14 Z" fill="${WH}"/>`));
  add("F99a", "F99a", "Chemin réservé", "indication", "Chemin réservé aux usagers représentés (piétons, cyclistes, cavaliers…). Autres véhicules interdits, sauf exception.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.ped(BLK), 50, 32, 0.34)}${at(G.bike(BLK), 50, 66, 0.4)}`));
  add("F103", "F103", "Zone piétonne", "indication", "Zone réservée aux piétons ; seuls certains véhicules autorisés peuvent y entrer, au pas.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.ped(BLK), 38, 50, 0.5)}${at(G.ped(BLK), 64, 54, 0.42)}`));
  add("F111", "F111", "Rue cyclable", "indication", "Les cyclistes peuvent utiliser toute la largeur de leur côté ; les véhicules à moteur ne peuvent PAS les dépasser ; 30 km/h max.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.bike(RED), 50, 34, 0.48)}${at(G.carSide(BLK), 50, 70, 0.4)}`));

  /* ---------- Panneaux supplémentaires ---------- */
  const rocks = (c = BLK) => `<path d="M70 6 L94 6 L94 94 L70 94 Z" fill="${c}" opacity=".85"/><circle cx="50" cy="30" r="9" fill="${c}"/><circle cx="36" cy="56" r="11" fill="${c}"/><circle cx="54" cy="84" r="9" fill="${c}"/><path d="M6 94 H66" stroke="${c}" stroke-width="5"/>`;
  const gravel = (c = BLK) => `${at(G.carSide(c), 50, 34, 0.7)}<g fill="${c}"><circle cx="20" cy="74" r="5"/><circle cx="36" cy="84" r="4"/><circle cx="54" cy="72" r="5"/><circle cx="72" cy="86" r="4"/><circle cx="84" cy="72" r="5"/></g>`;
  const wind = (c = BLK) => `<path d="M14 10 V94" stroke="${c}" stroke-width="7"/><path d="M18 18 L86 30 L86 50 L18 58 Z" fill="${RED}" stroke="${c}" stroke-width="3"/><path d="M40 22 V54 M62 26 V50" stroke="${WH}" stroke-width="6"/>`;
  const txt = (t, size = 30, c = BLK) => `<text x="50" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="${c}">${t}</text>`;
  const bikeArrow = (dir) => `${at(G.bike(BLK), 46, 40, 0.34)}${dir === "right" ? `<path d="M38 58 H60 V52 L72 62 L60 72 V66 H38 Z" fill="#f08a00"/>` : `<path d="M44 74 V56 H38 L50 44 L62 56 H56 V74 Z" fill="#f08a00" transform="translate(0 4)"/>`}`;

  add("A17", "A17", "Projection de gravillons", "danger", "Gravillons sur la chaussée : ralentir pour éviter les projections et les dérapages.", () => tri(gravel()));
  add("A19", "A19", "Chute de pierres", "danger", "Risque de pierres sur la route (paroi rocheuse) : prudence, surtout après la pluie ou le gel.", () => tri(rocks()));
  add("A37", "A37", "Vent latéral", "danger", "Rafales possibles (viaduc, sortie de forêt) : tenir fermement le volant, attention en dépassant un camion.", () => tri(wind()));
  add("A49", "A49", "Traversée de tram", "danger", "Annonce un endroit où un tram traverse la chaussée.", () => tri(G.tram()));
  add("B22", "B22", "Cyclistes : tourner à droite au feu rouge", "priorite", "Placé sous un feu : les cyclistes (et cyclomoteurs A, EDP selon le cas) peuvent tourner à droite au rouge en cédant le passage. Ne concerne pas les voitures.", () => triInv(bikeArrow("right")));
  add("B23", "B23", "Cyclistes : aller tout droit au feu rouge", "priorite", "Placé sous un feu : les cyclistes peuvent continuer tout droit au rouge en cédant le passage. Ne concerne pas les voitures.", () => triInv(bikeArrow("up")));
  add("C5", "C5", "Accès interdit aux véhicules à moteur (sauf motos solo)", "interdiction", "Interdit aux véhicules automobiles à plus de deux roues et aux motos avec side-car.", () => circRed(at(G.carSide(BLK), 50, 50, 0.92)));
  add("C21", "C21", "Masse maximale autorisée", "interdiction", "Interdit aux véhicules dont la masse en charge dépasse la valeur indiquée (ici 3,5 t).", () => circRed(txt("3,5t", 34)));
  add("C23", "C23", "Accès interdit aux véhicules de transport de marchandises", "interdiction", "Interdit aux camions et camionnettes affectés au transport de choses (souvent avec un panneau additionnel de masse).", () => circRed(at(G.truck(BLK), 50, 52, 0.92)));
  add("C27", "C27", "Largeur maximale", "interdiction", "Interdit aux véhicules (chargement compris) plus larges que la valeur indiquée.", () => circRed(`${txt("2,3m", 28)}<path d="M8 50 L20 42 V58 Z M92 50 L80 42 V58 Z" fill="${BLK}"/>`));
  add("C29", "C29", "Hauteur maximale", "interdiction", "Interdit aux véhicules (chargement compris) plus hauts que la valeur indiquée.", () => circRed(`${txt("3,5m", 28)}<path d="M50 6 L42 18 H58 Z M50 94 L42 82 H58 Z" fill="${BLK}"/>`));
  add("C39", "C39", "Dépassement interdit aux camions", "interdiction", "Interdit aux véhicules de transport de choses de plus de 3,5 t de dépasser un véhicule à plus de deux roues.", () => circRed(`${at(G.carTop(BLK), 66, 50, 0.9)}${at(`<rect x="30" y="4" width="40" height="92" rx="4" fill="${RED}"/>`, 34, 50, 0.9)}`));
  add("C43_120", "C43", "Vitesse maximale 120 km/h", "interdiction", "Interdit de dépasser 120 km/h.", () => circRed(G.num(120, BLK, 40)));
  add("D11", "D11", "Chemin obligatoire pour piétons", "obligation", "Partie de la voie réservée et obligatoire pour les piétons.", () => circBlue(G.ped(WH)));
  add("F12b", "F12b", "Fin de zone résidentielle / de rencontre", "indication", "Fin de la zone : en la quittant, vous cédez le passage à tous les autres usagers.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.house(BLUE), 34, 44, 0.6)}${at(G.ped(BLUE), 62, 46, 0.42)}${at(G.carSide(BLUE), 56, 76, 0.32)}<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="7"/>`));
  add("F17", "F17", "Bande réservée aux bus", "indication", "Bande réservée aux bus (et aux usagers éventuellement indiqués). Les autres véhicules ne peuvent pas y circuler.", () => square(`${txt("BUS", 30, WH)}<path d="M50 70 V90" stroke="${WH}" stroke-width="5"/><path d="M30 14 V86 M70 14 V86" stroke="${WH}" stroke-width="3" stroke-dasharray="8 6"/>`));
  add("F104", "F104", "Fin de zone piétonne", "indication", "Fin de la zone piétonne.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.ped(BLK), 38, 50, 0.5)}${at(G.ped(BLK), 64, 54, 0.42)}<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="7"/>`));
  add("F113", "F113", "Fin de rue cyclable", "indication", "Fin de la rue cyclable : les règles habituelles (dépassement possible, vitesse de l'endroit) s'appliquent de nouveau.", () => square(`<rect x="13" y="13" width="74" height="74" rx="4" fill="${WH}"/>${at(G.bike(RED), 50, 34, 0.48)}${at(G.carSide(BLK), 50, 70, 0.4)}<line x1="14" y1="86" x2="86" y2="14" stroke="${RED}" stroke-width="7"/>`));

  window.SIGNS = S;
  window.signSVG = (key) => (S[key] ? S[key].svg() : "");
  window.SIGN_CATS = {
    danger: "Danger (A)",
    priorite: "Priorité (B)",
    interdiction: "Interdiction (C)",
    obligation: "Obligation (D)",
    stationnement: "Arrêt & stationnement (E)",
    indication: "Indication (F)",
  };

  /* ---------- Schémas de carrefour (vue du dessus) ----------
   * scene({ arms:["N","S","E","W"], cars:[{id:"A", from:"S", go:"straight|left|right", color}], signs:{S:"B1"}, tram:{from:"W"} }) */
  const DIRS = { S: 0, W: 90, N: 180, E: 270 }; // rotation : véhicule venant du Sud = 0°
  window.sceneSVG = function (sc) {
    const arms = sc.arms || ["N", "S", "E", "W"];
    const W = 300, C = 150, R = 42; // demi-largeur de route
    let s = `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" role="img" class="scene">`;
    s += `<rect width="${W}" height="${W}" fill="var(--grass)"/>`;
    const road = (d) => {
      const r = DIRS[d];
      return `<g transform="rotate(${r} ${C} ${C})"><rect x="${C - R}" y="${C}" width="${2 * R}" height="${C}" fill="var(--asphalt)"/><line x1="${C}" y1="${C + R + 8}" x2="${C}" y2="${W}" stroke="#fff" stroke-width="3" stroke-dasharray="14 12"/></g>`;
    };
    arms.forEach((a) => (s += road(a)));
    s += `<rect x="${C - R}" y="${C - R}" width="${2 * R}" height="${2 * R}" fill="var(--asphalt)"/>`;
    // Tram : rails sur l'axe E-O
    if (sc.tram) {
      s += `<g opacity=".9"><line x1="0" y1="${C - 6}" x2="${W}" y2="${C - 6}" stroke="#9aa" stroke-width="2"/><line x1="0" y1="${C + 6}" x2="${W}" y2="${C + 6}" stroke="#9aa" stroke-width="2"/></g>`;
    }
    // Panneaux aux entrées
    const signPos = { S: [C + R + 22, C + R + 30], N: [C - R - 22, C - R - 30], E: [C + R + 30, C - R - 22], W: [C - R - 30, C + R + 22] };
    Object.entries(sc.signs || {}).forEach(([d, key]) => {
      const [x, y] = signPos[d];
      s += `<g transform="translate(${x - 17} ${y - 17})"><svg width="34" height="34" viewBox="0 0 100 100">${S[key].svg().replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>`;
    });
    // Véhicules
    const arrow = (go) => {
      // flèche partant de l'avant du véhicule (coordonnées dans le repère "venant du Sud")
      const x = C + R / 2, y = C + R + 4;
      if (go === "straight") return `M${x} ${y} V${C - R - 22}`;
      if (go === "right") return `M${x} ${y} Q${x} ${C + R / 2} ${C + R + 26} ${C + R / 2}`;
      return `M${x} ${y} Q${x} ${C - R / 2} ${C - R - 26} ${C - R / 2}`; // left
    };
    (sc.cars || []).forEach((car) => {
      const r = DIRS[car.from];
      const x = C + R / 2, y = C + R + 34;
      const isTram = car.tram;
      const col = car.color || "#e8553f";
      s += `<g transform="rotate(${r} ${C} ${C})">`;
      if (car.go) s += `<path d="${arrow(car.go)}" fill="none" stroke="${col}" stroke-width="4" stroke-dasharray="7 5" marker-end="url(#ah-${car.id})"/>`;
      s += `<defs><marker id="ah-${car.id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${col}"/></marker></defs>`;
      if (isTram) {
        s += `<rect x="${x - 15}" y="${y - 22}" width="30" height="80" rx="6" fill="${col}" stroke="#222" stroke-width="2"/>`;
      } else {
        s += `<rect x="${x - 13}" y="${y - 20}" width="26" height="42" rx="7" fill="${col}" stroke="#222" stroke-width="2"/><rect x="${x - 9}" y="${y - 13}" width="18" height="9" rx="2" fill="#dfe8f0"/>`;
      }
      s += `<g transform="rotate(${-r} ${x} ${y + 6})"><circle cx="${x}" cy="${y + 6}" r="11" fill="#fff" stroke="#222" stroke-width="1.5"/><text x="${x}" y="${y + 7}" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="13" fill="#111">${car.id}</text></g>`;
      s += `</g>`;
    });
    // Piéton
    if (sc.ped) {
      const [px, py] = sc.ped;
      s += `<g transform="translate(${px - 12} ${py - 12})"><svg width="24" height="24" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#ffd34d"/>${at(G.ped(BLK), 50, 50, 0.7)}</svg></g>`;
    }
    if (sc.zebra) {
      // passage piétons sur le bras indiqué
      const r = DIRS[sc.zebra];
      s += `<g transform="rotate(${r} ${C} ${C})">`;
      for (let i = 0; i < 7; i++) s += `<rect x="${C - R + 4 + i * 12}" y="${C + R + 4}" width="7" height="22" fill="#fff"/>`;
      s += `</g>`;
    }
    return s + `</svg>`;
  };
})();
