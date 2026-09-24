import Constants from 'expo-constants';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:8001';

const STRIPE_PK =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

if (__DEV__ && !STRIPE_PK) {
  console.warn('Stripe publishable key is missing. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
}

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
  CREATE_PAYMENT_INTENT: '/payments/create-intent',
  CONFIRM_PAYMENT: '/payments/confirm-payment',
  GET_PAYMENT_STATUS: '/payments/payment-status',
  PROCESS_REFUND: '/payments/process-refund',
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
    const res = await fetch(STRIPE_CONFIG.BACKEND_URL, { method: 'GET' });
    return res.ok;
  } catch (error) {
    if (__DEV__) console.error('Backend non accessible:', error);
    return false;
  }
};
