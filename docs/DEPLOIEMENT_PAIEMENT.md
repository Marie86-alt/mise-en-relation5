# Déploiement du paiement — webhook Stripe

Depuis la version backend 1.1.0, **le serveur est la source de vérité des paiements** :
le webhook Stripe écrit `transactions`, `services` et le statut de `conversations` ;
l'application mobile ne fait plus qu'afficher. Sans le webhook configuré, les paiements
Stripe aboutissent mais **rien n'est enregistré côté plateforme**.

## 1. Compte de service Firebase (écriture Firestore côté serveur)

Firebase Console → Paramètres du projet → *Comptes de service* → **Générer une nouvelle clé privée**.

Sur Railway, deux options :
- **Variable `FIREBASE_SERVICE_ACCOUNT_JSON`** : coller le contenu complet du fichier JSON (recommandé).
- ou déposer le fichier en `backend/service-account.json` (jamais commité : il est dans `.gitignore`).

Sans compte de service, le webhook répond `500 Firestore unavailable` et Stripe réessaie (jusqu'à 3 jours).

## 2. Endpoint webhook dans Stripe

Dashboard Stripe → *Développeurs* → *Webhooks* → **Ajouter un endpoint** :

| Champ | Valeur |
|---|---|
| URL | `https://mise-en-relation5-production-7e5b.up.railway.app/api/payments/webhook` |
| Événements | `payment_intent.succeeded`, `payment_intent.payment_failed` |
| Version API | celle par défaut du compte |

Copier le **secret de signature** (`whsec_…`) → variable Railway `STRIPE_WEBHOOK_SECRET`.

⚠️ Le mode **test** et le mode **live** ont chacun leur endpoint et leur secret.

## 3. Variables d'environnement Railway

| Variable | Valeur | Rôle |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` | déjà en place |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | **nouveau** — signature du webhook |
| `FIREBASE_PROJECT_ID` | `mise-en-relation-app-prod` | déjà en place |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON du compte de service | **nouveau** — écriture Firestore |
| `PAYMENT_AUTH_REQUIRED` | `false` pour l'instant | voir §5 |
| `DEPOSIT_RATE` | `0.20` (défaut) | part de l'acompte |
| `COMMISSION_RATE` | `0.40` (défaut) | commission plateforme, enregistrée sur chaque transaction |

## 4. Règles Firestore

`firestore.rules` : `transactions` et `services` ne sont **plus modifiables par le client**
(lecture seule pour le client et l'aidant concernés). Déployer :

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Authentification obligatoire — calendrier

L'application publiée (1.0.2) n'envoie **pas** de token Firebase au backend. Tant qu'elle est en
circulation, `PAYMENT_AUTH_REQUIRED` doit rester `false` (les montants restent vérifiés côté serveur,
et le webhook enregistre les paiements quoi qu'il arrive).

Dès que la prochaine version (qui envoie le token) est disponible sur les stores :
1. `PAYMENT_AUTH_REQUIRED=true` sur Railway ;
2. après quelques semaines, retirer les routes de compatibilité (`compat_router` dans `payments.py`).

## 6. Vérifier que ça marche

1. Stripe Dashboard → Webhooks → l'endpoint → *Envoyer un événement test* `payment_intent.succeeded`
   → réponse `200 {"received": true, "handled": true, "recorded": …}`.
   (`recorded: false, reason: unknown_payment_type` est normal pour un événement test sans métadonnées.)
2. Faire un vrai paiement d'acompte en mode test depuis l'app : dans Firestore, un document
   `transactions/pi_…` apparaît avec `type: "acompte"`, `commission`, `montantAidant`, et
   `conversations/{id}.status` passe à `acompte_paye` même si l'app est fermée juste après le paiement.
3. Logs Railway : `PaymentIntent pi_… enregistré (deposit, conversation …)`.

## 7. Ce que le webhook écrit

```
transactions/{paymentIntentId}
  type: "acompte" | "final"      montant: 12.00 (€)      commission: 4.80
  montantAidant: 7.20            totalAmount: 60         status: "completed"
  clientId, aidantId, serviceId (= conversationId), currency, stripeStatus, createdAt

services/{conversationId}
  status: "acompte_paye" → "termine"    montant (total €)    secteur, jour, heureDebut, heureFin, adresse
  depositPaidAt / finalPaidAt / completedAt

conversations/{conversationId}
  status: "acompte_paye" → "termine"   (l'app suit ce statut en temps réel)

payment_failures/{paymentIntentId}     (échecs, lecture admin)
```

Les rejeux d'événements par Stripe sont sans effet : une transaction `completed` n'est jamais réécrite.
