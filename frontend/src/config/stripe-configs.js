import Constants from 'expo-constants';

export const getStripeConfig = () => ({
  PUBLISHABLE_KEY:
    Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    '',
});
