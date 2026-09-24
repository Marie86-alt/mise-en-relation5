# Audit — A La Case Nout Gramoun (mise-en-relation5)

**Date** : 24 septembre 2026
**Périmètre** : dépôt `mise-en-relation5`, branche `mariecorrection` (travail non commité inclus), comparée à `main`.
**Méthode** : lecture du code (frontend Expo + backend FastAPI + règles Firestore), `tsc --noEmit` (0 erreur), `pytest` (12 tests, 12 OK), analyse git.

Légende sévérité : **P0** bloquant avant mise en production réelle · **P1** à corriger rapidement · **P2** dette / qualité · **P3** confort.

---

## 1. Résumé

| Domaine | État |
|---|---|
| Compilation TypeScript | ✅ 0 erreur |
| Tests backend | ✅ 12/12 |
| Règles Firestore | ✅ solides sur `users` / `conversations`, ⚠️ trop permissives sur `services` / `transactions` |
| Paiement Stripe | ⚠️ montant vérifié côté serveur, mais **aucun webhook** : la preuve de paiement est écrite par le client |
| Auth backend | ⚠️ optionnelle par défaut (`PAYMENT_AUTH_REQUIRED=false`) |
| Hygiène git | ⚠️ `frontend/.env` suivi, fichiers `.backup`/logs suivis, 34 fichiers non commités |
| Hébergement backend | ✅ Railway (`eas.json`) |

Le projet est **fonctionnel et proprement structuré** pour un MVP. Les trois points qui empêchent de le qualifier de « prêt pour de l'argent réel » sont tous dans le flux paiement (§3.1 à §3.3).

---

## 2. Ce qui est bien fait

- **`firestore.rules`** : deny par défaut, rôles admin, un utilisateur ne peut modifier que ses propres champs autorisés (`ownerEditableUserKeysOnly`), profils publics uniquement si `isVerified && !isSuspended && !isDeleted`, messages limités aux participants.
- **Backend** : montant recalculé côté serveur (`_calculate_authoritative_amount`, `Decimal`, `ROUND_HALF_UP`), vérification du token Firebase avec contrôle `clientId == uid`, erreurs Stripe mappées en codes HTTP corrects, configuration centralisée, routes séparées, tests mockant Stripe.
- **Frontend** : `ErrorBoundary`, dark mode complet (`ThemeContext`, `themes.ts`), panneau admin découpé en composants, `ErrorService` centralisé, skeletons de chargement, pagination des profils (`searchProfilesPage`).
- **Le travail non commité** (`authProfileUpdates.ts`, `paymentAmounts.ts`, `firebase_auth.py`, `profileFilters.ts`) va dans la bonne direction : whitelist des champs profil, montants centralisés, filtres testables.

---

## 3. Findings

### 3.1 — P0 — Pas de webhook Stripe : la transaction est écrite par le client

**Où** : `frontend/app/paiement.tsx:163`, `frontend/app/paiement-final.tsx:140`, `frontend/src/services/firebase/serviceManagement.ts`.

Après le PaymentSheet, c'est l'application qui appelle `confirmPayment` (simple `retrieve` Stripe) puis écrit `transactions` dans Firestore, avec `commission: 0` en dur. Le backend ne persiste rien.

**Conséquences** :
- Crash / perte réseau entre le débit et l'écriture → argent encaissé, aucune trace côté plateforme.
- `firestore.rules` autorise `create` sur `transactions` et `services` pour tout client authentifié → un utilisateur peut écrire une transaction « acompte payé » sans avoir payé.
- `paiement-final.tsx` ne crée même pas de transaction `final` → les stats admin (`statisticsService`) qui reposent sur `type === 'final'` sont fausses.

**Correction** : endpoint `POST /api/payments/webhook` (vérification de signature `STRIPE_WEBHOOK_SECRET`), sur `payment_intent.succeeded` → écriture serveur (Firebase Admin) de `transactions/{paymentIntentId}` et mise à jour de `services/{conversationId}` ; règles Firestore : `transactions` et `services` en écriture admin/serveur uniquement ; le client passe en lecture seule et écoute le document.

### 3.2 — P0 — Authentification du paiement optionnelle par défaut

**Où** : `backend/app/config.py:29`, `backend/app/firebase_auth.py:55`, `backend/app/routes/payments.py:69`.

`PAYMENT_AUTH_REQUIRED` vaut `false` par défaut : un intent peut être créé sans token. Idem pour le montant : sans `type`/`totalAmount` dans les métadonnées, le montant du client est accepté tel quel. Documenté comme compatibilité avec l'app déjà publiée — compréhensible, mais tant que c'est ouvert, la vérification serveur de §2 est contournable.

**Correction** : `PAYMENT_AUTH_REQUIRED=true` sur Railway dès que l'app publiée envoie le token (c'est déjà le cas dans `httpPaymentService.ts`) ; refuser les intents sans métadonnées de prix ; journaliser puis supprimer les routes `compat_router`.

### 3.3 — P0 (métier) — Aucun reversement aux aidants dans le code

Le modèle 60 / 40 est affiché partout (`conversation.tsx`, `paiement-final.tsx`, `PricingDisplay`) mais rien ne verse 60 % à l'aidant : la plateforme encaisse 100 %. Au-delà de l'opérationnel, encaisser pour compte de tiers en France relève de la réglementation des services de paiement ; **Stripe Connect** (comptes Express + `transfer_data`) est la réponse standard. À trancher avec la cliente avant d'aller plus loin sur le paiement.

### 3.4 — P1 — Tarifs et commission codés en dur dans le client

`HOURLY_RATE = 22`, `SPECIAL_OFFERS = {3: 60}`, minimum 2 h, `0.20` / `0.80`, `0.40` : dupliqués dans `pricing.ts`, `paymentAmounts.ts`, `conversation.tsx` (getAcompteAmount…), `paiement-final.tsx`, `profile.tsx` (`tarifHeure: 22`), `statisticsService.ts` et `payments.py`. Tout changement de prix = nouvelle release + risque d'incohérence client/serveur.

**Correction** : document Firestore `config/pricing` (lecture publique, écriture admin) lu par l'app **et** par le backend ; une seule fonction de calcul partagée côté client (`paymentAmounts.ts` est le bon candidat).

### 3.5 — P1 — `frontend/.env` suivi par git

`git ls-files` liste `frontend/.env` (clé publishable Stripe **production**, config Firebase, URL backend) malgré le `.gitignore`. Pas des secrets au sens strict, mais rien à faire sur GitHub.

**Correction** : `git rm --cached frontend/.env`, commit, vérifier la visibilité du dépôt, créer `frontend/.env.example`. Idem pour `profile.tsx.backup`, `crash_logs.txt`, `.claude/settings.local.json`.

### 3.6 — P1 — Avis : statistiques calculées côté client, écrasables

`avisService.updateAidantStats` recalcule et écrit `aidant_stats/{aidantId}` depuis le client. Les règles Firestore mettent `aidant_stats` en écriture admin → **cette écriture échoue silencieusement** en production (catch → `console.error`), donc `averageRating` / `totalReviews` ne sont jamais mis à jour. De plus `profile-list.tsx` lit `averageRating` sur `users`, pas sur `aidant_stats`.

**Correction** : Cloud Function (ou webhook backend) `onCreate(avis)` → recalcul serveur et écriture dans `users/{aidantId}.averageRating` ; supprimer `updateAidantStats` côté client.

### 3.7 — P1 — Suppression de compte incomplète (`main`)

`deleteAccount` (ajouté sur `main`) supprime `users/{uid}` puis l'utilisateur Auth. Restent orphelins : conversations, messages, avis, transactions, services. Les règles interdisent au client de supprimer ses conversations → impossible de nettoyer depuis l'app.

**Correction** : Cloud Function `onDelete(auth user)` → anonymisation / suppression en cascade ; côté client, marquer `isDeleted: true` et laisser le serveur faire le reste (RGPD : prévoir la purge réelle).

### 3.8 — P2 — `conversation.tsx` : 964 lignes, logique métier dans l'écran

Chat + tarification + confirmation + paiement + évaluation + avis dans un seul composant, avec des `console.log` de debug (`🔍 Debug renderTarificationInfo`) et un texte « Debug: Durée moins de 2h = OUI/NON » **visible dans l'UI** (`conversation.tsx:574`). `useConversationLogic.ts` existe mais n'est pas branché. Le calcul de durée est refait à la main (`isServiceUnavailable`) alors que `PricingService` le fait déjà.

**Correction** : brancher `useConversationLogic`, extraire `ServiceStepper` / `PricingCard` / `ReviewForm`, supprimer les logs et le texte debug.

### 3.9 — P2 — Doublons et fichiers morts

- `dateValidation.ts` **et** `dateValidation.tsx` (même contenu, celui qui gagne dépend de la résolution Metro).
- `src/config/firebase-configs.js`, `stripe-configs.js`, `config.prod.ts` redondants avec `firebase.config.js` et `config/stripe.ts`.
- `src/styles/theme.ts` (THEME orange `#FF6B35`) vs `constants/Colors.ts` (`#e67e22`) vs `constants/themes.ts` (`primary: '#0066cc'` bleu) : **trois sources de vérité pour la couleur primaire**, et elles ne sont pas d'accord.
- `seedData.ts` : profils de test parisiens (garde d'enfants, ménage) sans rapport avec le métier ; écrit dans `profiles` que l'app ne lit pas.
- `profile-detail.tsx` : avis de secours **inventés** (« Très professionnelle et attentionnée ») affichés en cas d'erreur réseau — trompeur pour l'utilisateur, à retirer.
- `app/(tabs)/contact.tsx` vide (0 Ko) alors que `app/contact.tsx` existe hors des tabs.
- `frontend/Microsoft/` : cache PowerShell créé par erreur dans le projet, à supprimer et ignorer.

### 3.10 — P2 — Admin : requêtes sans index et suppression client lourde

- `admin.tsx:78` : `where('isVerified','==',false) + orderBy('createdAt')` et `:113` `orderBy('lastMessage.createdAt')` → index composites absents de `firestore.indexes.json` (l'index déclaré pour `services` est incohérent : deux fois `createdAt`).
- `deleteUser` supprime messages et conversations **un par un depuis le téléphone** (N+1 requêtes) — à déplacer côté serveur.
- Onglet « Admin » présent dans la tab bar pour tous les utilisateurs (`(tabs)/_layout.tsx`), masqué seulement par le contenu.

### 3.11 — P2 — `main` diverge et le travail récent n'est pas sauvegardé

`main` a 8 commits que `mariecorrection` n'a pas (suppression de compte, publication Apple, version) ; `mariecorrection` a 34 fichiers modifiés non commités depuis mai 2026 (durcissement paiement). Aucun des deux n'est complet. → Fusion réalisée dans le cadre de cet audit (voir journal git).

### 3.12 — P3 — Divers

- `signup.tsx` : bordure rouge « pour debug » sur les champs (`borderColor: '#ff0000'`) — visible en production.
- `login.tsx` / `signup.tsx` : pas de « mot de passe oublié », pas de thème sombre (couleurs en dur).
- `contact.tsx` : boucle de diagnostic `Linking.canOpenURL` au montage, logs verbeux.
- `paiement.tsx` : placeholder « 123 Rue de la Paix, 75001 Paris » pour une app réunionnaise.
- `pydantic` : `class Config` / `schema_extra` dépréciés (warnings tests) → `ConfigDict(json_schema_extra=…)`.
- `requirements.txt` épinglé à `fastapi 0.110` / `pydantic 2.4` : à remonter avant que les CVE ne s'accumulent.

---

## 4. Plan d'action recommandé

| # | Action | Sévérité | Effort |
|---|---|---|---|
| 1 | Webhook Stripe + écriture serveur de `transactions`/`services` + règles Firestore en lecture seule côté client | P0 | 1–2 j |
| 2 | `PAYMENT_AUTH_REQUIRED=true`, refus des intents sans métadonnées, retrait `compat_router` | P0 | ½ j |
| 3 | Décision cliente : Stripe Connect (reversement 60 %) ou paiement manuel assumé | P0 | décision |
| 4 | `config/pricing` dans Firestore, calcul unique client + serveur | P1 | 1 j |
| 5 | `git rm --cached` `.env` / `.backup` / logs, `.env.example` | P1 | ¼ j |
| 6 | Cloud Function stats avis + cascade suppression compte | P1 | 1 j |
| 7 | Refactor `conversation.tsx` (hook + 3 composants), retrait des debug | P2 | 1 j |
| 8 | Nettoyage doublons (dateValidation, configs, thèmes) — une seule palette | P2 | ½ j |
| 9 | Index Firestore admin, suppression admin côté serveur | P2 | ½ j |

---

## 5. Vérifications effectuées

```
frontend : node node_modules/typescript/bin/tsc --noEmit   → 0 erreur
backend  : python -m pytest ../tests -q                     → 12 passed
git      : main..mariecorrection = 0 commit ; mariecorrection..main = 8 commits ; 34 fichiers modifiés non commités
```
