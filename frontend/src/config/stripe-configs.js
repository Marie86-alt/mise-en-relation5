// src/config/stripe-configs.js
const DEV_STRIPE = {
  PUBLISHABLE_KEY: "pk_test_51Rw4TLK4P8PBhDaP4DLO3Pgt9yUvGFuF8dFn93z5xGhybVxZmw22Os3gwFHJ5TcT7Bwg7BBy4Xd71WvmEQrc4ma400zCTApKYb"
};

const PROD_STRIPE = {
  PUBLISHABLE_KEY: "pk_test_temporaire" // Remplacez par pk_live_ une fois Stripe validé
};

export const getStripeConfig = () => {
  return __DEV__ ? DEV_STRIPE : PROD_STRIPE;
};