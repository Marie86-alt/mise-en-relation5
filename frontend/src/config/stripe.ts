
// // src/config/stripe.ts
// const isDev = __DEV__;

// export const STRIPE_CONFIG = {
//   // 🔑 CLÉS STRIPE
//   PUBLISHABLE_KEY: isDev
//     ? 'pk_test_51Rw4TLK4P8PBhDaP4DLO3Pgt9yUvGFuF8dFn93z5xGhybVxZmw22Os3gwFHJ5TcT7Bwg7BBy4Xd71WvmEQrc4ma400zCTApKYb' // Test
//     : 'pk_test_temporaire', // Production temporaire (remplacez par pk_live_ plus tard)
 
//   // 🌐 URL BACKEND
//   BACKEND_URL: isDev
//     ? 'http://192.168.1.155:3000' // Dev
//     : 'https://mise-en-relation-app-prod.web.app', // Production
 
//   CURRENCY: 'eur',
//   COUNTRY: 'FR',
 
//   PAYMENT_METADATA: {
//     source: 'mise-en-relation-app',
//     version: '1.0',
//   }
// };

// // Le reste de votre code reste identique
// export const STRIPE_ENDPOINTS = {
//   CREATE_PAYMENT_INTENT: '/create-payment-intent',
//   CONFIRM_PAYMENT: '/confirm-payment',
//   GET_PAYMENT_STATUS: '/payment-status',        
//   PROCESS_REFUND: '/process-refund',
// };

// export const STRIPE_ERRORS = {
//   'card_declined': 'Votre carte a été refusée',
//   'insufficient_funds': 'Fonds insuffisants sur votre carte',
//   'expired_card': 'Votre carte a expiré',      
//   'incorrect_cvc': 'Code de sécurité incorrect',
//   'processing_error': 'Erreur de traitement du paiement',
//   'network_error': 'Erreur de connexion',      
//   'unknown_error': 'Une erreur inattendue s\'est produite',
// };

// export const testBackendConnection = async () => {
//   try {
//     console.log('🔍 Test connexion backend:', STRIPE_CONFIG.BACKEND_URL);
//     const response = await fetch(STRIPE_CONFIG.BACKEND_URL);
//     const data = await response.json();
//     console.log('✅ Backend accessible:', data);
//     return true;
//   } catch (error) {
//     console.error('❌ Backend non accessible:', error);
//     return false;
//   }


// src/config/stripe.ts
import Constants from 'expo-constants';
const isDev = __DEV__;

// Utiliser les variables d'environnement Expo
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                   process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'https://buffy-previsible-cooingly.ngrok-free.dev';

const STRIPE_PK = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
                 process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
                 'pk_live_51Rw4TC2egT4ENWecEsH5CKF9lfqH4MvW2YOYqDuikwRRTnCmu0hdvbIzW0YVNn9RAljc8KMiOPEIf2yQj7yYoSSh00XyQ4JX09';

console.log('🐛 DEBUG - Variables env:', {
  BACKEND_URL,
  STRIPE_PK: STRIPE_PK?.substring(0, 20) + '...',
});

console.log('🔍 URL complète pour debug:', BACKEND_URL);
console.log('📱 Est-ce que buffy est dans l\'URL ?', BACKEND_URL?.includes('buffy'));

// Force la bonne URL en dur pour test
const FORCE_URL = 'https://buffy-previsible-cooingly.ngrok-free.dev';
console.log('🚨 FORCE URL pour test:', FORCE_URL);

export const STRIPE_CONFIG = {
  // 🔑 CLÉ PUBLIQUE STRIPE LIVE
  PUBLISHABLE_KEY: STRIPE_PK,

  // 🌐 BACKEND_URL - Force la bonne URL pour debug
  BACKEND_URL: FORCE_URL, // Temporaire : force l'URL qui fonctionne

  CURRENCY: 'eur',
  COUNTRY: 'FR',

  PAYMENT_METADATA: {
    source: 'mise-en-relation-app',
    version: '1.0',
  },
};

/**
 * ⚠️ Endpoints pour le serveur Express.js (kebab-case)
 */
export const STRIPE_ENDPOINTS = {
  CREATE_PAYMENT_INTENT: '/create-payment-intent',
  CONFIRM_PAYMENT: '/confirm-payment',

  GET_PAYMENT_STATUS: '/payment-status',
  PROCESS_REFUND: '/process-refund',
};

export const STRIPE_ERRORS = {
  card_declined: 'Votre carte a été refusée',
  insufficient_funds: 'Fonds insuffisants sur votre carte',
  expired_card: 'Votre carte a expiré',
  incorrect_cvc: 'Code de sécurité incorrect',
  processing_error: 'Erreur de traitement du paiement',
  network_error: 'Erreur de connexion',
  unknown_error: "Une erreur inattendue s'est produite",
};

export const testBackendConnection = async () => {
  try {
    console.log('🔍 Test connexion backend:', STRIPE_CONFIG.BACKEND_URL);
    console.log('🔍 URL complète:', STRIPE_CONFIG.BACKEND_URL + STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT);
    const res = await fetch(
      STRIPE_CONFIG.BACKEND_URL + STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT,
      { method: 'OPTIONS' } // ping simple (géré par notre CORS)
    );
    console.log('✅ Backend accessible:', res.status);
    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error);
    return false;
  }
};
