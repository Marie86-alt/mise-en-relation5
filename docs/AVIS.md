# Avis clients et notes des aidants

## Le problème corrigé

L'application écrivait la note moyenne de l'aidant (`aidant_stats/{aidantId}`) **depuis le téléphone
du client**. Les règles Firestore l'interdisaient : l'écriture échouait en silence et les notes
n'ont jamais été mises à jour — les avis laissés ne comptaient pas.

## Le fonctionnement actuel

1. À la fin du service, l'app envoie l'avis au backend : `POST /api/reviews` (token Firebase obligatoire).
2. Le backend vérifie que l'auteur est **le client** d'une conversation **terminée** (`evaluation` ou `termine`)
   et que l'aidant en est bien le second participant.
3. L'avis est enregistré dans `avis/{conversationId}__{clientId}` : **un avis par client et par
   conversation**, renvoyer l'avis met à jour le précédent (pas de doublon en cas de réessai).
4. La note est recalculée depuis **tous** les avis de l'aidant et écrite sur `users/{aidantId}` :
   `averageRating` (1 décimale), `totalReviews`, `ratingDistribution` — champs que la liste et la
   fiche aidant lisent déjà. `aidant_stats/{aidantId}` est aussi mis à jour (compatibilité).

## Réparer les notes existantes

Les avis déposés avant cette version (et ceux de l'application publiée 1.0.2, qui écrit encore
directement dans `avis`) n'ont jamais été comptés. Une fois le backend déployé :

**Admin → Stats → « Recalculer les notes des aidants »** (appelle `POST /api/reviews/recompute`,
réservé aux administrateurs). À refaire ponctuellement tant que la 1.0.2 est en circulation.

## Règles Firestore

- `avis` : lecture par les utilisateurs connectés ; création directe **tolérée** pour l'app publiée,
  mais bornée (note entière 1..5, auteur = client connecté et participant de la conversation) ;
  à fermer (`allow create: if false`) quand la 1.0.2 ne sera plus utilisée.
- `aidant_stats` : écriture serveur uniquement.

Déployer : `firebase deploy --only firestore:rules`.

## Codes de retour de `POST /api/reviews`

| Code | Cas |
|---|---|
| 201 | avis enregistré (`created: true`) ou mis à jour (`created: false`), avec la nouvelle note |
| 401 | pas de token |
| 403 | auteur non participant, aidant qui se note lui-même, ou non-client de la conversation |
| 404 | conversation introuvable |
| 409 | service pas encore terminé |
| 422 | note hors 1..5, commentaire > 1000 caractères |
| 503 | Firestore non configuré côté serveur (compte de service manquant) |
