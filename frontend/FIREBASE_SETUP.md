# 🔥 Configuration Firebase pour le Backend

## 📋 Prérequis

Vous avez besoin d'un fichier **service-account.json** pour que le backend puisse se connecter à Firebase.

## 📥 Obtenir le fichier service-account.json

1. **Allez sur Firebase Console** : https://console.firebase.google.com/
2. Sélectionnez votre projet : **mise-en-relation-app-prod**
3. Cliquez sur l'icône ⚙️ **Settings** (en haut à gauche)
4. Allez dans **Project Settings**
5. Allez dans l'onglet **Service Accounts**
6. Cliquez sur **Generate new private key**
7. Téléchargez le fichier JSON

## 📂 Placer le fichier

```bash
# Renommez le fichier téléchargé
mv ~/Downloads/mise-en-relation-app-prod-xxxxx.json ~/mise-en-relation4/backend/service-account.json

# Vérifiez que le fichier est là
ls -la ~/mise-en-relation4/backend/service-account.json
```

## ✅ Le fichier est déjà dans .gitignore

Le fichier `service-account.json` est automatiquement ignoré par Git pour la sécurité.

**⚠️ NE JAMAIS committer ce fichier dans Git !**

## 🚀 Démarrer le backend

```bash
cd ~/mise-en-relation4/backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances (inclut firebase-admin)
pip install -r requirements.txt

# Démarrer le serveur
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

## 🧪 Tester la connexion

Ouvrez votre navigateur : http://localhost:8001/api/health

Vous devriez voir :
```json
{
  "status": "healthy",
  "database": "connected",
  "firebase_sdk": true,
  "timestamp": "2025-01-03T..."
}
```

## ❓ Problèmes courants

### Erreur : "FIREBASE_PROJECT_ID n'est pas défini"

✅ **Solution** : Vérifiez que le fichier `backend/.env` contient :
```
FIREBASE_PROJECT_ID=mise-en-relation-app-prod
```

### Erreur : "service-account.json not found"

✅ **Solution** : Placez le fichier dans `backend/service-account.json`

### Erreur : "firebase-admin not installed"

✅ **Solution** : Installez les dépendances :
```bash
pip install -r requirements.txt
```

## 🔐 Sécurité

- ✅ `service-account.json` est dans `.gitignore`
- ✅ Ne jamais partager ce fichier
- ✅ En production, utilisez des variables d'environnement ou un service de secrets

## 📚 Documentation Firebase

- [Firebase Admin Python SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
