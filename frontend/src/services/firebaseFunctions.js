import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '../../firebase.config';
//import app from '../../firebase.config';

const functions = getFunctions(app, 'europe-west1'); // Même région

export const createDepositPaymentIntent = httpsCallable(functions, 'createDepositPaymentIntent');
export const createFinalPaymentIntent = httpsCallable(functions, 'createFinalPaymentIntent'); 
export const confirmPayment = httpsCallable(functions, 'confirmPayment');

// Fonction helper pour appeler avec authentification
export const callSecureFunction = async (func, data) => {
  if (!auth.currentUser) {
    throw new Error('Utilisateur non connecté');
  }
  
  const result = await func(data);
  return result.data;
};