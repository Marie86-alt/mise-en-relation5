# 🏠 A La Case Nout Gramoun - Application de Mise en Relation

## 📱 Description

Application mobile de mise en relation développée avec **Expo (React Native)**, **FastAPI** et **Firebase Firestore**.

L'application permet de mettre en relation des prestataires de services à domicile avec des clients.

## 🛠️ Technologies

- **Frontend**: Expo SDK 54, React Native 0.81.5, TypeScript, Expo Router
- **Backend**: FastAPI (Python), Firebase Admin SDK
- **Base de données**: Firebase Firestore
- **Paiements**: Stripe (Live Keys configurées)
- **Authentification**: Firebase Auth

## 📦 Structure du Projet

```
.
├── backend/              # API FastAPI
│   ├── .env             # Variables d'environnement backend
│   ├── server.py        # Point d'entrée de l'API
│   ├── service-account.json  # Credentials Firebase
│   └── requirements.txt # Dépendances Python
│
├── frontend/            # Application Expo
│   ├── app/            # Routes (expo-router)
│   ├── src/            # Code source
│   ├── assets/         # Images, fonts, etc.
│   ├── .env            # Variables d'environnement
│   ├── app.json        # Configuration Expo
│   └── package.json    # Dépendances npm
│
└── README.md           # Ce fichier
```

## 🚀 Installation et Démarrage

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## 🔐 Variables d'Environnement

Voir les fichiers `.env` dans `backend/` et `frontend/` pour la configuration complète.

## 📝 Licence

Propriétaire - Tous droits réservés

---
**Version**: 1.0.0
