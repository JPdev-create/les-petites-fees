# ✨ Les Petites Fées — Planning nettoyage

Application de gestion des plannings de nettoyage de gîtes, appartements et bureaux
pour **Les Petites Fées**, service de nettoyage à Marche-en-Famenne.

- **Clients (propriétaires)** : connexion en un clic (Google, ou lien par e-mail), encodage des dates en moins de 30 secondes, historique, factures.
- **Gestionnaires** : tableau de bord, calendrier global (mois / semaine / liste), validation des demandes en masse, alertes de fin de mois, synchronisation Airbnb / Booking (iCal), facturation mensuelle (communication structurée belge), linge & stock, journal des e-mails.
- **Automatique** : relances des clients le 20 et le 25 du mois, e-mails de confirmation / refus / changement de date, envoi des factures.
- **PWA** : s'installe sur téléphone comme une application, consultable même avec un réseau faible.

Hébergé sur **GitHub Pages** (gratuit) · données dans **Firebase Firestore** (région Belgique) · automatisations par **GitHub Actions**.

🌐 **Site :** https://jpdev-create.github.io/les-petites-fees/

---

## Architecture

| Élément | Rôle |
|---|---|
| `src/app/espace/*` | Espace client (propriétaire) |
| `src/app/admin/*` | Espace gestionnaire |
| `firestore.rules` | **Sécurité** : chaque client n'accède qu'à ses lieux, passages et factures |
| `scripts/automation.ts` | E-mails, synchro iCal, relances (lancé toutes les 30 min par GitHub Actions) |
| `.github/workflows/deploy.yml` | Publication du site à chaque `git push` |
| `.github/workflows/automation.yml` | Planificateur des automatisations |

Le site est 100 % statique : toute la logique « serveur » est soit dans les règles Firestore (sécurité),
soit dans le script d'automatisation (e-mails, iCal).

---

## Mise en ligne (une seule fois)

### 1. Firebase
1. **Authentication → Mode de connexion** : activer **Google** et **Adresse e-mail/Mot de passe** avec l'option **« Lien envoyé par e-mail »**.
2. **Authentication → Paramètres → Domaines autorisés** : ajouter `<pseudo>.github.io`.
3. **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** : garder le fichier JSON en lieu sûr (ne jamais le mettre dans le dépôt).
4. Publier les règles de sécurité et les index (depuis ce dossier) :
   ```bash
   npx firebase login
   npm run deploy:rules
   ```
5. Créer le premier compte gestionnaire (les suivants s'ajoutent depuis l'application, menu *Clients → Gestionnaires*) :
   ```bash
   FIREBASE_SERVICE_ACCOUNT="$(cat chemin/vers/cle.json)" npm run create-admin -- votre.adresse@gmail.com "Prénom Nom"
   ```

### 2. Gmail (envoi des e-mails automatiques)
1. Sur le compte Gmail de l'entreprise : activer la **validation en deux étapes**.
2. Créer un **mot de passe d'application** (Compte Google → Sécurité → Mots de passe des applications).

### 3. GitHub
Dans le dépôt : **Settings → Secrets and variables → Actions** :

| Type | Nom | Valeur |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | Contenu complet du fichier JSON de l'étape 1.3 |
| Secret | `SMTP_USER` | `petitesfeesdemarche@gmail.com` |
| Secret | `SMTP_PASS` | Mot de passe d'application Gmail |
| Variable *(optionnel)* | `APP_URL` | URL du site si domaine personnalisé |
| Variable *(optionnel)* | `BASE_PATH` | Vide (`""`) si domaine personnalisé |

Puis **Settings → Pages → Source : GitHub Actions**, et pousser le code sur `main`.
Le site est en ligne sur `https://<pseudo>.github.io/<depot>/` après ~2 minutes.

> Sans `SMTP_USER`/`SMTP_PASS`, les e-mails sont « simulés » : ils apparaissent dans *Journal* mais ne partent pas.

### SMS (optionnel)
Ajouter les secrets `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` : les clients qui ont coché « Rappels par SMS » reçoivent aussi la relance de fin de mois par SMS.

---

## Utilisation au quotidien

1. **Ajouter un client** : *Clients → Nouveau client* (nom + e-mail), puis **Inviter** pour lui envoyer son accès.
2. **Ajouter ses lieux** : *Gîtes & lieux → Nouveau lieu* (adresse, accès, prix, linge, liens iCal Airbnb/Booking).
3. Le client encode ses dates → elles arrivent dans **Demandes** (et par e-mail) → **Confirmer** (une par une ou toutes d'un coup). Le client est prévenu automatiquement.
4. Après le passage : **Demandes → À clôturer → Marquer effectués**.
5. En début de mois : **Factures → Générer les factures** → vérifier → **Envoyer** → **Payée** à réception.

### Logo
Déposer le logo (PNG, fond transparent, version blanche) dans `public/logo.png`, puis `node scripts/icons.mjs` pour régénérer les icônes de l'application.

---

## Développement local

Prérequis : Node 22+, Java 21 (pour les émulateurs Firebase).

```bash
npm install
npm run emulators      # terminal 1 : Firebase en local (aucune donnée réelle touchée)
npm run seed           # terminal 2 : données de démonstration
npm run dev            # terminal 2 : http://localhost:3000
```

Comptes de démo (émulateur) : `gestion@lespetitesfees.be` (gestionnaire), `marie.dupont@example.be` (cliente).

Tester les automatisations sur l'émulateur :
```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run automation
```
