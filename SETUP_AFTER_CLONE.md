# 🔧 Configuration Après Clone depuis GitHub

## 📝 Fichiers Sensibles à Recréer

Ces fichiers **ne sont pas** sur GitHub (pour des raisons de sécurité) et doivent être recréés manuellement.

---

## 1️⃣ Backend

### Créer `backend/.env`

```bash
cd backend
cp .env.example .env
```

Puis éditez `backend/.env` avec vos vraies valeurs :

```env
FIREBASE_PROJECT_ID=mise-en-relation-app-prod
STRIPE_SECRET_KEY=sk_live_VOTRE_VRAIE_CLE_SECRETE
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006
ENVIRONMENT=production
PORT=8001
```

**Où trouver les clés ?**
- **Stripe Secret Key** : https://dashboard.stripe.com/apikeys (section "Secret key")

### Créer `backend/service-account.json`

```bash
cp service-account.example.json service-account.json
```

Puis éditez `service-account.json` avec vos vraies credentials Firebase :

**Où trouver le fichier ?**
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet : `mise-en-relation-app-prod`
3. Cliquez sur l'icône ⚙️ (Paramètres) → "Project settings"
4. Onglet "Service accounts"
5. Cliquez "Generate new private key"
6. Copiez le contenu JSON dans `backend/service-account.json`

---

## 2️⃣ Frontend

### Créer `frontend/.env`

```bash
cd frontend
cp .env.example .env
```

Puis éditez `frontend/.env` avec vos vraies valeurs :

**Sur Emergent Platform :**
```env
EXPO_PACKAGER_PROXY_URL=https://VOTRE_URL.pkgwkr.buildcode.tools
EXPO_PACKAGER_HOSTNAME=VOTRE_URL.pkgwkr.buildcode.tools
EXPO_PUBLIC_BACKEND_URL=https://VOTRE_URL.pkgwkr.buildcode.tools
```

**En Local :**
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

**Stripe & Firebase :**
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_VOTRE_VRAIE_CLE_PUBLIQUE
EXPO_PUBLIC_FIREBASE_PROJECT_ID=mise-en-relation-app-prod
EXPO_PUBLIC_FIREBASE_API_KEY=VOTRE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=mise-en-relation-app-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=mise-en-relation-app-prod.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=VOTRE_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=VOTRE_APP_ID
```

**Où trouver les clés ?**
- **Stripe Publishable Key** : https://dashboard.stripe.com/apikeys (section "Publishable key")
- **Firebase Config** : 
  1. Firebase Console → Project Settings → Onglet "General"
  2. Scrollez jusqu'à "Your apps" → SDK setup and configuration
  3. Copiez les valeurs de `firebaseConfig`

---

## 3️⃣ Installer les Dépendances

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
yarn install
```

---

## 4️⃣ Démarrer l'Application

### Backend
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn start
```

---

## ✅ Vérifier que Tout Fonctionne

### Test Backend
```bash
curl http://localhost:8001/api/health
```

Résultat attendu :
```json
{
  "status": "healthy",
  "database": "connected",
  "firebase_sdk": true
}
```

### Test Frontend
Ouvrez http://localhost:3000 dans votre navigateur ou scannez le QR code avec Expo Go.

---

## 🔒 Sécurité

**IMPORTANT** : Ne **JAMAIS** commiter ces fichiers :
- `backend/.env`
- `backend/service-account.json`
- `frontend/.env`

Ils sont déjà dans `.gitignore` pour votre sécurité ! ✅

---

## 📞 Besoin d'Aide ?

Si vous avez des problèmes :
1. Vérifiez que tous les fichiers `.env` sont bien créés
2. Vérifiez que toutes les clés API sont correctes
3. Vérifiez les logs : `tail -f /var/log/supervisor/backend.err.log`
