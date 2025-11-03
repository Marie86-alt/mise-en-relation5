// src/stripe/firebaseFunctionsClient.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '../../firebase.config';

const functions = getFunctions(app, 'europe-west1');

export const fnCreateDeposit = httpsCallable(functions, 'createDepositPaymentIntent');
export const fnCreateFinal   = httpsCallable(functions, 'createFinalPaymentIntent');
export const fnConfirm       = httpsCallable(functions, 'confirmPayment');

// helper qui garantit l'auth
export async function callSecure<TRequest, TResponse>(
  fn: (data: TRequest) => Promise<{ data: TResponse }>,
  data: TRequest
): Promise<TResponse> {
  if (!auth.currentUser) throw new Error('Utilisateur non connecté');
  const res = await fn(data);
  return res.data;
}
