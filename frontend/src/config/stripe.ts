import Constants from 'expo-constants';

// Configuration Stripe depuis les variables d'environnement
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                   process.env.EXPO_PUBLIC_BACKEND_URL || 
                   'http://localhost:8001';

const STRIPE_PK = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
                 process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
                 'pk_live_51Rw4TC2egT4ENWecEsH5CKF9lfqH4MvW2YOYqDuikwRRTnCmu0hdvbIzW0YVNn9RAljc8KMiOPEIf2yQj7yYoSSh00XyQ4JX09';

console.log('🔧 Stripe Config:', {
  BACKEND_URL,
  STRIPE_PK: STRIPE_PK?.substring(0, 20) + '...',
});

export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: STRIPE_PK,
  BACKEND_URL: BACKEND_URL + '/api',
  CURRENCY: 'eur',
  COUNTRY: 'FR',
  PAYMENT_METADATA: {
    source: 'mise-en-relation-app',
    version: '1.0',
  },
};

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
    const res = await fetch(STRIPE_CONFIG.BACKEND_URL, { method: 'GET' });
    console.log('✅ Backend accessible:', res.status);
    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error);
    return false;
  }
};
