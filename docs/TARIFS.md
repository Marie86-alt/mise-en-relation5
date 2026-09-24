# Tarifs de la plateforme — `config/pricing`

Depuis cette version, **aucun tarif n'est codé dans l'application ni dans le backend**. Tout vient
du document Firestore `config/pricing`, modifiable par un administrateur depuis l'onglet
*Admin → Tarifs* de l'app. Les changements s'appliquent immédiatement, sans nouvelle version.

## Le document

```
config/pricing
  hourlyRate:     22        tarif horaire (€)
  minHours:       2         durée minimale d'un service (h)
  specialOffers:  { "3": 60 }   forfaits : heures → prix total (€)
  depositRate:    0.20      acompte à la réservation
  commissionRate: 0.40      part plateforme, enregistrée sur chaque transaction
  currency:       "EUR"
  updatedAt / updatedBy     renseignés automatiquement
```

Si le document n'existe pas, l'app et le serveur utilisent ces mêmes valeurs par défaut
(`frontend/src/config/pricingConfig.ts` et `backend/app/services/pricing_config.py`).
Le premier enregistrement depuis l'onglet Tarifs crée le document.

## Qui lit quoi

| Consommateur | Usage |
|---|---|
| Écran de recherche | durées proposées (≥ `minHours`), prix sous chaque durée, tarif horaire affiché |
| Conversation / acompte / solde | total, acompte (`depositRate`), solde ; le taux est transmis au serveur avec le paiement |
| Profil aidant | tarif horaire affiché et enregistré sur le profil |
| Admin → Stats | commission par défaut quand une transaction ancienne n'a pas la sienne |
| **Backend** `create-intent` | vérifie que l'acompte / le solde envoyés correspondent au `depositRate` courant |
| **Backend** webhook | calcule `commission` et `montantAidant` avec `commissionRate` |

Le backend relit le document au plus toutes les **60 secondes** (cache). Après un changement de
taux d'acompte, un paiement démarré dans la minute avec l'ancien taux peut être refusé
(`Invalid payment amount`) : l'utilisateur relance simplement le paiement.

## Garde-fous

Les valeurs saisies sont validées des deux côtés avec les mêmes bornes : tarif 1–500 €,
durée minimale 1–12 h, acompte 1–99 %, commission 0–99 %. Une offre plus chère que le tarif
normal, ou plus courte que la durée minimale, est ignorée. Une valeur illisible retombe sur
la valeur par défaut — une faute de saisie ne peut pas casser le calcul des prix.

## Règles Firestore

```
match /config/{docId} {
  allow read: if signedIn();
  allow write: if isAdmin();
}
```

À déployer avec `firebase deploy --only firestore:rules`.
