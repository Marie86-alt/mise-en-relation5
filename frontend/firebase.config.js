import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getFirebaseConfig } from './src/config/firebase-configs';

// Configuration automatique selon l'environnement
const firebaseConfig = getFirebaseConfig();

// Le reste reste identique
const app = initializeApp(firebaseConfig);
console.log('🔧 Firebase projectId =', firebaseConfig.projectId);


const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };
export default app;