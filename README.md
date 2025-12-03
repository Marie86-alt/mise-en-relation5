# 🏠 A La Case Nout Gramoun – Application de Mise en Relation

## 📱 Description

Application mobile de mise en relation développée avec **Expo (React Native)**, **FastAPI** et **Firebase Firestore**.

L’application permet de connecter des prestataires de services à domicile avec des clients via une interface fluide et moderne.

## 🛠️ Technologies

- **Frontend** : Expo SDK 54, React Native 0.81.5, TypeScript, Expo Router
- **Backend** : FastAPI (Python), Firebase Admin SDK
- **Base de données** : Firebase Firestore
- **Paiements** : Stripe
- **Authentification** : Firebase Auth

## 📦 Structure du Projet

```txt
.
├── backend/                  # API FastAPI
│   ├── .env                  # Variables d'environnement backend
│   ├── server.py             # Point d'entrée de l'API
│   ├── service-account.json  # Credentials Firebase (NE DOIT PAS ÊTRE COMMIS)
│   └── requirements.txt      # Dépendances Python
│
├── frontend/                 # Application mobile Expo
│   ├── app/                  # Routes (expo-router)
│   ├── src/                  # Code source
│   ├── assets/               # Images, fonts, etc.
│   ├── .env                  # Variables d'environnement
│   ├── app.json              # Configuration Expo
│   └── package.json          # Dépendances npm
│
└── README.md                 # Documentation du projet
🚀 Installation et Démarrage
🔧 Backend (FastAPI)
bash
Copier le code
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
📱 Frontend (Expo – développement local)
bash
Copier le code
cd frontend
npm install
npx expo start
Pour lancer sur un émulateur Android :

css
Copier le code
a
Si Expo demande une development build :

bash
Copier le code
npx expo run:android
📥 Installation APK pour Android
L’application Android peut être installée manuellement via un fichier APK ou AAB.

1. Télécharger l’APK
👉 Télécharger l’APK
(Remplacer par ton vrai lien)

2. Autoriser les sources inconnues
Android → Paramètres → Sécurité → Installer des applications inconnues.

3. Installer l’application
Ouvrir le fichier .apk

Confirmer l’installation

4. Mise à jour
Installer la nouvelle version par-dessus l’ancienne.

🔐 Variables d’Environnement
Les fichiers .env doivent être placés dans :

backend/.env

frontend/.env

Ils contiennent les informations :

URLs API

Config Firebase

Clé publique Stripe

⚠️ Ne jamais commiter .env ni service-account.json.

📝 Licence
Propriétaire – Tous droits réservés.

Version : 1.0.0
