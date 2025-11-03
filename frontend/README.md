# 🏠 A La Case Nout Gramoun - Application de Mise en Relation

## 📱 Description

Application mobile de mise en relation développée avec Expo (React Native) et FastAPI.

## 🛠️ Technologies

- **Frontend**: Expo SDK 54, React Native, TypeScript
- **Backend**: FastAPI, Python 3.10+
- **Base de données**: MongoDB
- **Paiements**: Stripe
- **Authentification**: Firebase Auth

## 📦 Installation

### Prérequis

- Node.js 18+
- Python 3.10+
- MongoDB (local ou cloud)
- Expo CLI

### Frontend

```bash
cd frontend

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos valeurs

# Installer les dépendances
yarn install

# Démarrer l'application
yarn start
```

### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos valeurs

# Installer les dépendances
pip install -r requirements.txt

# Démarrer le serveur
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

## 🔐 Configuration des variables d'environnement

### ⚠️ IMPORTANT - Sécurité

**NE JAMAIS** committer les fichiers `.env` ou les clés API dans Git !

### Frontend (.env)

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre-projet
EXPO_PUBLIC_ENV=development
```

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=mise_en_relation
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
STRIPE_SECRET_KEY=sk_test_...
```

## 📱 Structure du projet

```
.
├── frontend/           # Application Expo
│   ├── app/           # Routes (expo-router)
│   ├── components/    # Composants réutilisables
│   ├── assets/        # Images, fonts, etc.
│   └── src/           # Code source
├── backend/           # API FastAPI
│   ├── server.py      # Point d'entrée
│   └── .env           # Variables d'environnement (non committé)
└── README.md
```

## 🧪 Tests

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
yarn test
```

## 📱 Tester sur mobile

### Avec Expo Go

1. Installer Expo Go sur votre téléphone
2. Scanner le QR code généré par `yarn start`

### Build Android

Voir le guide: [GUIDE_BUILD_APK.md](GUIDE_BUILD_APK.md)

## 🔄 Déploiement

### Backend

- Configurer les variables d'environnement en production
- Utiliser `uvicorn` avec Gunicorn pour la production
- Configurer MongoDB Atlas pour la base de données

### Frontend

- Utiliser EAS Build pour créer les builds iOS/Android
- Soumettre à l'App Store / Google Play

## 🐛 Problèmes courants

### Erreur de connexion backend

- Vérifier que le backend est démarré
- Vérifier l'URL dans `.env`
- Vérifier que CORS est configuré correctement

### Erreur Stripe

- Vérifier que les clés Stripe sont correctes
- Utiliser les clés de test en développement

## 📚 Documentation supplémentaire

- [Guide Expo Go](COMMENT_OUVRIR_EXPO_GO.md)
- [Guide Build APK](GUIDE_BUILD_APK.md)
- [Guide Test Android](GUIDE_TEST_ANDROID.md)
- [Instructions Client](INSTRUCTIONS_CLIENTE_SIMPLE.md)
- [Guide de Sécurité](SECURITY.md)

## 👥 Contribution

1. Créer une branche depuis `main`
2. Faire vos modifications
3. Tester localement
4. Créer une Pull Request

## 📝 Licence

Propriétaire - Tous droits réservés

## 📞 Support

Pour toute question, contactez l'équipe de développement.
