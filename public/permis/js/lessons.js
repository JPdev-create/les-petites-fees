/* Fiches de cours — courtes, visuelles, orientées « ce qui tombe à l'examen ».
 * Chaque fiche : { id, theme (lié aux questions), titre, intro, chiffres:[[valeur, libellé]], html, pieges:[] } */
window.LESSONS = [
  {
    id: "examen", theme: "permis", titre: "L'examen théorique en 2026", intro: "Comment ça se passe, comment c'est noté, et les pièges du barème.",
    chiffres: [["50", "questions"], ["41/50", "pour réussir"], ["−5", "par faute grave"], ["3 ans", "de validité"]],
    html: `<h3>Le déroulement</h3>
<ul><li>Sur ordinateur, dans un centre d'examen agréé (GOCA en Flandre, AIBV / Autosécurité / SBAT… en Wallonie et à Bruxelles).</li>
<li>50 questions à choix multiple, avec photos ou dessins. On ne revient pas en arrière.</li>
<li>Une question non répondue dans le temps imparti compte comme une erreur.</li></ul>
<h3>Le barème</h3>
<ul><li>Erreur ordinaire : <b>−1 point</b>.</li><li>Faute grave (mise en danger : priorité, feu rouge, vitesse, alcool, ceinture, dépassement dangereux…) : <b>−5 points</b>.</li>
<li>Il faut <b>41/50</b>. Donc <b>2 fautes graves = échec</b> (40/50), même si tout le reste est juste. Avec 1 faute grave, il ne reste droit qu'à 4 erreurs légères.</li></ul>
<h3>En Wallonie depuis le 1er janvier 2026</h3>
<ul><li>Il faut aussi réussir le <b>test de perception des risques (TPR)</b> : des vidéos où l'on clique dès qu'on repère un danger.</li>
<li>Toute la formation (théorie, TPR, pratique) doit se faire dans <b>une seule Région</b>.</li></ul>`,
    pieges: ["Lis toute la question : « interdit », « sauf », « toujours » changent tout.", "Une réponse « logique » n'est pas toujours la réponse légale : c'est le Code qui compte.", "Les questions de priorité et de vitesse sont souvent des fautes graves : ne les bâcle jamais."],
  },
  {
    id: "vitesse", theme: "vitesse", titre: "Les limites de vitesse", intro: "Les chiffres changent selon la Région : c'est LE piège belge.",
    chiffres: [["50", "agglomération"], ["30", "Bruxelles (Ville 30)"], ["90 / 70", "hors agglo W / F"], ["120", "autoroute"]],
    html: `<table class="tbl"><tr><th>Endroit</th><th>Wallonie</th><th>Bruxelles</th><th>Flandre</th></tr>
<tr><td>Agglomération</td><td>50</td><td><b>30</b></td><td>50</td></tr>
<tr><td>Hors agglomération</td><td><b>90</b></td><td>(signalé)</td><td><b>70</b></td></tr>
<tr><td>2×2 bandes + berme centrale</td><td>120</td><td>—</td><td>120 (souvent 90 signalé)</td></tr>
<tr><td>Autoroute</td><td>120</td><td>120</td><td>120</td></tr>
<tr><td>Zone 30 / rue cyclable</td><td colspan="3">30</td></tr>
<tr><td>Zone résidentielle / de rencontre</td><td colspan="3">20</td></tr>
<tr><td>Zone piétonne, rue scolaire</td><td colspan="3">au pas</td></tr></table>
<h3>À retenir</h3>
<ul><li>Le panneau rond <b>C43</b> vaut jusqu'au <b>prochain carrefour</b> (sauf répétition). Le panneau de <b>zone</b> (F4a) vaut jusqu'au panneau de fin de zone.</li>
<li>La limite commence <b>au panneau</b> (F1 pour l'agglomération).</li>
<li>Vitesse minimale sur autoroute : <b>70 km/h</b> (code actuel ; supprimée le 1er juin 2027).</li>
<li>La vitesse doit toujours être <b>adaptée</b> : on doit pouvoir s'arrêter devant tout obstacle prévisible.</li></ul>
<h3>Physique du freinage</h3>
<ul><li>Distance de réaction ≈ vitesse ÷ 3,6 par seconde de réaction (90 km/h → 25 m).</li><li>Distance de freinage ∝ vitesse² : vitesse ×2 → distance ×4.</li><li>Distance d'arrêt = réaction + freinage.</li></ul>`,
    pieges: ["F1 (nom de ville) = 50 en Wallonie et en Flandre, 30 à Bruxelles.", "Ne confonds pas zone 30 (F4a, toute la zone) et C43 30 (jusqu'au carrefour).", "Zone résidentielle = 20, pas 30."],
  },
  {
    id: "priorite", theme: "priorite", titre: "Les priorités", intro: "La règle de base, les exceptions, et la méthode pour ne jamais se tromper.",
    chiffres: [["1", "agent"], ["2", "feux"], ["3", "panneaux"], ["4", "priorité de droite"]],
    html: `<h3>La hiérarchie</h3><ol><li><b>Agent qualifié</b></li><li><b>Signaux lumineux</b></li><li><b>Panneaux et marquages</b></li><li><b>Règles générales</b> (priorité de droite)</li></ol>
<h3>Priorité de droite</h3><p>Sans signalisation, on cède le passage à celui qui vient de droite. Méthode quand plusieurs véhicules arrivent : cherche celui qui <b>n'a personne à sa droite</b> → il passe en premier.</p>
<h3>Exceptions : vous cédez à TOUS</h3><ul><li>quand vous faites une <b>manœuvre</b> (démarrer, changer de bande, demi-tour, marche arrière) ;</li>
<li>quand vous sortez d'un <b>parking, d'une propriété, d'un chemin de terre, d'une station-service, d'une zone résidentielle</b> ;</li>
<li>face à un <b>B1</b> (cédez le passage) ou un <b>B5</b> (STOP : arrêt complet obligatoire).</li></ul>
<h3>Cas particuliers</h3><ul><li><b>Tram</b> : sauf signal contraire, il a la priorité, même venant de gauche.</li><li><b>Tourner à gauche</b> : on cède à ceux qui viennent en face.</li>
<li><b>Tourner</b> (gauche ou droite) : on cède aux piétons et cyclistes qui traversent la rue où l'on entre, même au vert.</li>
<li><b>Rond-point</b> D5 + B1 : priorité à ceux qui sont sur l'anneau. Clignotant à droite pour sortir.</li>
<li><b>Prioritaires</b> (feu bleu + sirène) : on libère le passage, au besoin on s'arrête. Le feu orange ne donne aucune priorité.</li></ul>
<h3>Les panneaux de priorité</h3><div class="signrow" data-signs="B1,B5,B9,B11,B15,B17,B19,B21"></div>`,
    pieges: ["B15 (barre verticale) = priorité au prochain carrefour ; B17 (X) = priorité de droite.", "Le clignotant ne donne jamais la priorité.", "STOP sans personne en vue : arrêt complet quand même."],
  },
  {
    id: "panneaux", theme: "panneaux", titre: "Lire les panneaux", intro: "Forme + couleur = famille. Apprends la logique, pas 200 dessins.",
    chiffres: [["△", "danger (A)"], ["○ rouge", "interdiction (C)"], ["○ bleu", "obligation (D)"], ["□", "indication (F)"]],
    html: `<ul><li><b>Triangle pointe en haut, bord rouge</b> : danger (A). Hors agglomération, à ±150 m du danger.</li>
<li><b>Triangle pointe en bas</b> : cédez le passage (B1). <b>Octogone</b> : STOP. <b>Losange jaune</b> : route prioritaire.</li>
<li><b>Rond bordé de rouge</b> : interdiction (C). <b>Rond blanc barré de noir</b> : fin d'interdiction.</li>
<li><b>Rond bleu</b> : obligation (D). <b>Carré/rectangle bleu</b> : indication (F) ou stationnement (E).</li>
<li><b>Panneau additionnel</b> : précise distance, durée, catégorie ou exception.</li></ul>
<h3>Paires qu'on confond</h3><div class="signrow" data-signs="C1,C3,E1,E3,D1,F19,A41,A43,A21,A23"></div>`,
    pieges: ["C1 (rond rouge plein + barre blanche) ≠ C3 (rond blanc bordé de rouge).", "E1 une barre = arrêt permis ; E3 croix = arrêt interdit.", "A41 barrière = avec barrières ; A43 locomotive = SANS barrières."],
  },
  {
    id: "feux", theme: "feux", titre: "Feux, agents et marquages", intro: "Ce que veulent dire les couleurs et les lignes au sol.",
    chiffres: [["Orange", "= stop si possible"], ["Clignotant", "= priorité normale"], ["Ligne continue", "= jamais franchir"]],
    html: `<ul><li><b>Rouge</b> : arrêt à la ligne. <b>Orange fixe</b> : arrêt, sauf si vous êtes trop près pour vous arrêter en sécurité. <b>Vert</b> : passage autorisé si le carrefour est dégagé.</li>
<li><b>Orange clignotant</b> : prudence ; on applique les panneaux ou la priorité de droite.</li>
<li><b>Flèche orange clignotante</b> : on peut aller dans la direction de la flèche en cédant le passage (souvent piétons/cyclistes).</li>
<li><b>B22/B23</b> sous un feu : seuls les <b>cyclistes</b> peuvent passer au rouge pour tourner à droite / aller tout droit, en cédant le passage.</li>
<li><b>Passage à niveau</b> : feux rouges clignotants = interdiction absolue de s'engager.</li></ul>
<h3>Marquages</h3><ul><li>Ligne blanche <b>continue</b> : interdit de franchir et de chevaucher. <b>Discontinue</b> : franchissable.</li>
<li>Bord jaune <b>discontinu</b> : stationnement interdit. Jaune <b>continu</b> : arrêt et stationnement interdits.</li>
<li><b>Dents de requin</b> : cédez le passage. Damier : passage cyclistes. Zébra : passage piétons.</li></ul>`,
    pieges: ["Agent > feu > panneau > règle générale.", "Vert ≠ priorité absolue : piétons qui traversent la rue où l'on tourne, et carrefour encombré."],
  },
  {
    id: "depassement", theme: "depassement", titre: "Croiser et dépasser", intro: "Où, comment, et surtout quand c'est interdit.",
    chiffres: [["1 m", "cycliste en agglo"], ["1,5 m", "cycliste hors agglo"], ["Tirette", "obligatoire"]],
    html: `<ul><li>On dépasse <b>par la gauche</b>. Par la droite : un véhicule qui tourne à gauche et s'est déporté, ou un tram (s'il reste assez de place).</li>
<li>Avant : rétros + angle mort, personne ne vous dépasse déjà, visibilité suffisante, place pour se rabattre.</li>
<li><b>Interdit</b> : sommet de côte et virage sans visibilité, derrière un véhicule arrêté devant un passage piétons, sous un C35 (sauf deux-roues).</li>
<li>Celui qui est dépassé serre à droite et <b>n'accélère pas</b>.</li>
<li><b>Tirette</b> : en cas de réduction de bandes, on roule jusqu'au rétrécissement puis on s'insère un à un.</li></ul>`,
    pieges: ["C35 n'interdit pas de dépasser une moto ou un vélo.", "Rue cyclable : interdit de dépasser un cycliste en voiture."],
  },
  {
    id: "stationnement", theme: "stationnement", titre: "Arrêt et stationnement", intro: "Les distances à connaître par cœur.",
    chiffres: [["5 m", "passage piétons / carrefour"], ["15 m", "arrêt de bus"], ["2 h", "zone bleue"], ["1,5 m", "à laisser aux piétons"]],
    html: `<ul><li><b>Arrêt</b> = le temps de faire monter/descendre ou de charger/décharger. Au-delà : <b>stationnement</b>.</li>
<li>À droite (ou des deux côtés dans une rue à sens unique).</li>
<li><b>Arrêt et stationnement interdits</b> : trottoirs et pistes cyclables (sauf autorisation), passages piétons/cyclistes et 5 m avant, à moins de 5 m d'un carrefour, sur les passages à niveau, dans les tunnels, aux endroits où le véhicule masque la signalisation…</li>
<li><b>Stationnement interdit</b> : à 15 m d'un arrêt de bus/tram, devant les entrées carrossables, sur les bandes bus…</li>
<li><b>Zone bleue</b> : disque obligatoire, 2 h max en principe (jours ouvrables 9 h-18 h).</li>
<li>Zone résidentielle : uniquement aux emplacements marqués.</li></ul>
<div class="signrow" data-signs="E1,E3,E9a,E9a_disque"></div>`,
    pieges: ["Les feux de détresse ne rendent jamais un stationnement légal.", "E1 = déposer quelqu'un reste permis."],
  },
  {
    id: "autoroute", theme: "autoroute", titre: "Autoroute", intro: "Une route rapide avec des règles strictes.",
    chiffres: [["120", "max"], ["70", "min (code actuel)"], ["100 m", "triangle"], ["112", "en cas de panne dangereuse"]],
    html: `<ul><li>S'insérer : prendre de la vitesse sur la bande d'accélération et <b>céder le passage</b> à ceux qui sont déjà sur l'autoroute.</li>
<li>Rouler sur la bande la plus à droite possible ; les autres servent à dépasser.</li>
<li><b>Interdits</b> : demi-tour, marche arrière, emprunter la berme centrale, s'arrêter hors des endroits prévus.</li>
<li>Bande d'arrêt d'urgence : nécessité absolue uniquement.</li>
<li>Croix rouge au-dessus d'une bande : on la quitte.</li>
<li>Panne : rejoindre si possible la sortie ou une zone refuge ; sinon gilet avant de sortir, tout le monde derrière la glissière, triangle à 100 m si possible sans danger, dépanneur agréé.</li></ul>`,
    pieges: ["Pas de tirette sur une bande d'accélération.", "Sortie ratée : on continue jusqu'à la suivante."],
  },
  {
    id: "vulnerables", theme: "vulnerables", titre: "Piétons, cyclistes, trottinettes et zones", intro: "Les usagers les plus fragiles, et les zones où ils sont rois.",
    chiffres: [["< 10 ans", "vélo sur trottoir"], ["25 km/h", "trottinette électrique"], ["16 ans", "âge mini trottinette"]],
    html: `<ul><li>Passage piétons : on laisse passer ceux qui sont engagés <b>ou vont s'engager</b>. On ne dépasse pas un véhicule arrêté devant un passage.</li>
<li><b>Sens unique limité</b> : les cyclistes peuvent rouler à contresens si un panneau M le permet.</li>
<li><b>Rue cyclable (F111)</b> : 30 km/h, interdit de dépasser les cyclistes.</li>
<li><b>Zone résidentielle / de rencontre (F12a)</b> : 20 km/h, piétons sur toute la largeur, jeux permis.</li>
<li><b>Zone piétonne (F103)</b> et <b>rue scolaire</b> : véhicules autorisés seulement, au pas.</li>
<li><b>Trottinettes électriques</b> : 25 km/h max, 16 ans minimum (sauf exceptions), pas de passager, pas sur le trottoir (sauf autorisation).</li>
<li><b>Bus</b> en agglomération qui quitte son arrêt avec le clignotant : on le laisse partir.</li>
<li>Ouvrir sa portière : vérifier, idéalement avec la main opposée (« Dutch reach »).</li></ul>
<div class="signrow" data-signs="F12a,F103,F111,F99a,D7,D9,A23,A25"></div>`,
    pieges: ["Zone résidentielle = 20 km/h ; zone piétonne = au pas.", "Distance latérale vélo : 1 m en agglo, 1,5 m hors agglo."],
  },
  {
    id: "alcool", theme: "alcool", titre: "Alcool, drogues, GSM, fatigue", intro: "Les causes n° 1 d'accidents graves… et les sanctions 2026.",
    chiffres: [["0,5 g/l", "limite (B)"], ["0,2 g/l", "professionnels"], ["12 h", "retrait mini (2026)"], ["191 €", "GSM en main"]],
    html: `<ul><li>Taux maximum : <b>0,5 g/l</b> de sang = <b>0,22 mg/l</b> d'air expiré. Conducteurs professionnels : 0,2 g/l.</li>
<li><b>Depuis le 1er juillet 2026</b> : interdiction de conduire de <b>12 heures</b> dans tous les cas de dépassement (avant : 3, 6 ou 12 h). Amende de 197 € au premier palier.</li>
<li>Au-delà de 0,8 g/l : tribunal, retrait de 15 jours possible, alcolock possible.</li>
<li>Refus de souffler = sanction maximale.</li>
<li>Drogues : <b>tolérance zéro</b>. La kétamine est ajoutée à la liste (loi de 2026, dès que les tests seront disponibles).</li>
<li><b>GSM tenu en main</b> : interdit, même au feu rouge ou dans un bouchon. 3e degré : <b>191 €</b> depuis juillet 2026.</li>
<li>Fatigue : pause toutes les 2 h ; seul le sommeil soigne la fatigue.</li>
<li>Seul le <b>temps</b> élimine l'alcool (≈ 0,1 à 0,15 g/l par heure).</li></ul>`,
    pieges: ["Café, douche froide, air frais : aucun effet sur le taux.", "Immobile au feu ≠ à l'arrêt : GSM interdit."],
  },
  {
    id: "securite", theme: "securite", titre: "Ceinture et enfants", intro: "Sécurité passive : ce qui sauve des vies quand l'accident arrive.",
    chiffres: [["1,35 m", "siège enfant"], ["3 ans", "jamais sans siège avant"], ["Tous", "ceinture avant & arrière"]],
    html: `<ul><li>Ceinture obligatoire pour tous les occupants, à l'avant et à l'arrière.</li>
<li>Le conducteur est responsable des passagers de <b>moins de 18 ans</b>.</li>
<li>Enfant de <b>moins de 1,35 m</b> : dispositif de retenue adapté (coque, siège, rehausseur).</li>
<li>Siège <b>dos à la route à l'avant</b> : airbag passager désactivé obligatoirement.</li>
<li>Exception : s'il est impossible d'installer un 3e siège à l'arrière, un enfant de 3 ans ou plus peut utiliser la ceinture adulte.</li>
<li>Appui-tête : haut au niveau du sommet de la tête, proche de la tête.</li></ul>`,
    pieges: ["Jamais un enfant sur les genoux, même pour un petit trajet."],
  },
  {
    id: "vehicule", theme: "vehicule", titre: "Véhicule et éclairage", intro: "Ce que la voiture doit avoir, et quand allumer quoi.",
    chiffres: [["1,6 mm", "pneus mini"], ["200 m", "visibilité → croisement"], ["100 m", "brouillard arrière"]],
    html: `<ul><li>Équipements obligatoires : <b>triangle, gilet fluo, extincteur, trousse de secours</b>.</li>
<li>Pneus : 1,6 mm minimum. Pneus hiver non obligatoires en Belgique.</li>
<li>Feux de croisement : la nuit et quand la visibilité est inférieure à 200 m.</li>
<li>Feux de route : interdits quand on croise ou suit un véhicule de près, et en agglomération bien éclairée.</li>
<li>Brouillard arrière : visibilité &lt; 100 m (brouillard, neige, forte pluie) seulement.</li>
<li>Feux de détresse : véhicule dangereux, ralentissement brusque, remorquage. Jamais pour stationner.</li>
<li>Témoin rouge au tableau de bord : s'arrêter dès que possible.</li></ul>`,
    pieges: ["Les feux de position seuls ne permettent jamais de rouler."],
  },
  {
    id: "accident", theme: "accident", titre: "Panne, accident, premiers secours", intro: "Sécuriser, alerter, secourir.",
    chiffres: [["112", "urgences"], ["30 m", "triangle (route)"], ["100 m", "triangle (autoroute)"]],
    html: `<ol><li><b>Sécuriser</b> : feux de détresse, gilet, triangle (30 m, 100 m sur autoroute), garer son véhicule en sécurité.</li>
<li><b>Alerter</b> : 112 (où, quoi, combien de victimes, état).</li>
<li><b>Secourir</b> : ne pas déplacer un blessé sauf danger ; inconscient qui respire → PLS ; ne respire pas → massage cardiaque + DEA.</li></ol>
<ul><li>Ne pas retirer le casque d'un motard qui respire.</li><li>Dégâts matériels : constat européen d'accident.</li><li>Quitter les lieux sans laisser son identité = délit de fuite.</li></ul>`,
    pieges: ["Ordre S-A-S : on ne secourt pas avant d'avoir sécurisé (sinon, sur-accident)."],
  },
  {
    id: "conduite", theme: "conduite", titre: "Anticiper les dangers (TPR)", intro: "Voir le danger avant qu'il n'arrive : c'est ce que teste le test de perception des risques.",
    chiffres: [["2 s", "distance de sécurité"], ["×2", "par temps de pluie"], ["25 m", "piéton sombre visible"]],
    html: `<h3>Les indices qui doivent t'alerter</h3><ul><li>Un <b>ballon</b> → un enfant suit.</li><li>Des <b>feux de recul</b> ou une roue braquée → une voiture va bouger.</li>
<li>Un <b>bus à l'arrêt</b> → des piétons traversent devant/derrière.</li><li>Une <b>portière</b> qui s'ouvre, une tête dans une voiture garée → quelqu'un va sortir.</li>
<li>Un <b>camion</b> qui tourne → angle mort, cyclistes.</li><li>De la <b>boue</b> → tracteur, chaussée glissante.</li>
<li><b>Nuit</b> : un piéton en sombre n'est visible qu'à ±25 m en feux de croisement.</li></ul>
<h3>Bonnes pratiques</h3><ul><li>Règle des 2 secondes (doubler sous la pluie).</li><li>Regarder loin, scanner les rétros toutes les 5 à 8 s.</li><li>Freiner avant le virage, pas dedans.</li><li>Aquaplaning : lâcher l'accélérateur, roues droites, pas de freinage brusque.</li></ul>`,
    pieges: ["Dans le TPR, cliquer trop tôt ou trop souvent peut aussi coûter des points : clique quand le danger se concrétise."],
  },
  {
    id: "nouveautes", theme: "permis", titre: "Ce qui a changé en 2026", intro: "Les nouveautés récentes à connaître (et à ne pas confondre avec 2027).",
    chiffres: [["1/1/2026", "formation dans une seule Région"], ["1/7/2026", "amendes +10 %"], ["12 h", "retrait alcool"]],
    html: `<ul><li><b>1er janvier 2026</b> : toute la formation (théorie, TPR, pratique) se fait dans une seule Région. En Wallonie : théorique + TPR wallons obligatoires pour l'examen pratique.</li>
<li><b>1er janvier 2026</b> : Bruxelles supprime la formation obligatoire aux premiers secours pour les candidats au permis B.</li>
<li><b>1er juillet 2026</b> : amendes routières (perceptions immédiates) +10 % : 64 / 128 / 191 / 520 € selon le degré ; vitesse 58 € jusqu'à 10 km/h d'excès.</li>
<li><b>1er juillet 2026</b> : interdiction de conduire de 12 h pour tout dépassement du taux d'alcool ; 197 € au premier palier.</li>
<li><b>2026</b> : conduire une trottinette électrique ou un cyclomoteur A pendant une déchéance devient une infraction à part entière.</li>
<li><b>2026</b> : kétamine ajoutée aux drogues interdites au volant (application quand les tests salivaires seront prêts).</li>
<li>Toujours <b>pas de permis à points</b> appliqué en Belgique.</li></ul>
<p class="note">Sources : SPF Police (police.be), Wallonie, sites spécialisés, recoupés en novembre 2026. En cas de doute, la référence reste le texte officiel (Moniteur belge, codedelaroute.be).</p>`,
    pieges: ["Tout ce qui concerne le Code de la voie publique ne s'applique qu'à partir du 1er juin 2027."],
  },
  {
    id: "code2027", theme: "permis", titre: "Le Code de la voie publique (1er juin 2027)", intro: "Le nouveau code remplace le Code de la route de 1975. Publié en 2024, reporté au 1er juin 2027.",
    chiffres: [["1/6/2027", "entrée en vigueur"], ["4", "codes (fédéral + 3 Régions)"], ["2 s", "distance obligatoire > 50 km/h"]],
    html: `<p>À l'examen, c'est le code <b>en vigueur le jour de l'examen</b> qui compte. Mais si tu passes ton pratique en 2027, mieux vaut savoir ce qui arrive :</p>
<ul><li>Suppression de la <b>vitesse minimale de 70 km/h</b> sur autoroute.</li>
<li><b>2 secondes</b> de distance obligatoires sur les routes limitées à plus de 50 km/h.</li>
<li>Piétons : règle de traversée étendue aux pistes cyclables, bandes bus ; traversée en diagonale possible aux carrefours équipés d'un feu piéton spécial.</li>
<li>Cyclistes : pistes cyclables plus obligatoires dans les zones à 50 km/h ; cyclomoteurs B sur la chaussée là où la limite est ≤ 50 km/h ; vélos parfois autorisés sur le trottoir (piétons prioritaires).</li>
<li>Nouvelle famille de panneaux de « zones » (scolaire, piétonne, résidentielle, cyclable) avec la vitesse indiquée, qui peut varier selon la Région.</li>
<li>Le triangle ne devrait plus être obligatoire à placer sur autoroute (trop dangereux à poser).</li></ul>`,
    pieges: ["Ne réponds pas avec les règles 2027 si tu passes l'examen avant le 1er juin 2027."],
  },
];
