import Constants from 'expo-constants';

console.log('🚀 BOOT extra:', Constants.expoConfig?.extra);

// ---- Config DEV (test)
const DEV_CONFIG = {
  apiKey: "AIzaSyDSr-Bn_JOwdHUsnWBJ_TFy75zcNPU113E",
  authDomain: "mise-en-relation-app-fc187.firebaseapp.com",
  projectId: "mise-en-relation-app-fc187",
  storageBucket: "mise-en-relation-app-fc187.firebasestorage.app",
  messagingSenderId: "725605633193",
  appId: "1:725605633193:web:437ef93f522c8c81f6adb8"
};

// ---- Config PROD
const PROD_CONFIG = {
  apiKey: "AIzaSyC7eiIuPV7kmFBovT3Rh8FoRV0hxldeXmQ",
  authDomain: "mise-en-relation-app-prod.firebaseapp.com",
  projectId: "mise-en-relation-app-prod",
  storageBucket: "mise-en-relation-app-prod.firebasestorage.app",
  messagingSenderId: "1099216291733",
  appId: "1:1099216291733:web:31e98363d331b75d56d89c"
};

// Récupère l'environnement voulu :
// 1) variable d'env EXPO_PUBLIC_ENV (recommandé)
// 2) app.json -> extra.env (fallback)
// 3) 'dev' par défaut
const getEnv = () => {
  try {
    // via variable d'environnement
    if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ENV) {
      return process.env.EXPO_PUBLIC_ENV;
    }
  } catch (_) {}
  try {
    // via app.json / app.config.* (Expo)
    const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra) || {};
    if (extra.env) return extra.env;
  } catch (_) {}
  return 'dev';
};

const ENV = getEnv();

export const getFirebaseConfig = () => {
  const useProd = ENV === 'prod';
  console.log('🔧 Firebase ENV =', ENV, '→', useProd ? 'PROD' : 'DEV');
  return useProd ? PROD_CONFIG : DEV_CONFIG;
};
