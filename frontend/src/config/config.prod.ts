import Constants from 'expo-constants';

export const CONFIG = {
  ENVIRONMENT: 'production',
  FIREBASE: {
    apiKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  STRIPE: {
    PUBLISHABLE_KEY:
      Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      '',
  },
};
