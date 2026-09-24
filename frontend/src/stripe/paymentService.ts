// src/stripe/paymentService.ts
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { PricingResult } from '../utils/pricing';
import { HttpPaymentService } from './httpPaymentService';
import { calculatePaymentAmounts } from './paymentAmounts';

let initPaymentSheet: any;
let presentPaymentSheet: any;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stripe = require('@stripe/stripe-react-native');
  initPaymentSheet = stripe.initPaymentSheet;
  presentPaymentSheet = stripe.presentPaymentSheet;
}

export interface PaymentData {
  conversationId: string;
  aidantId: string;
  clientId: string;
  pricingData: PricingResult;
  serviceDetails?: {
    secteur?: string;
    jour?: string;
    heureDebut?: string;
    heureFin?: string;
    adresse?: string;
  };
  /** Taux d'acompte issu de config/pricing au moment de la réservation (défaut : 20 %) */
  depositRate?: number;
}

type InitResult =
  | { success: true; paymentIntentId?: string }
  | { success: false; error: string; errorCode?: string };

type SimpleResult = { success: true } | { success: false; error: string };

const RETURN_URL = Linking.createURL('payment-return');

// ---------- ACOMPTE (20%) ----------
async function initializeDepositPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    const amounts = calculatePaymentAmounts(total, 'deposit', data.depositRate);

    const dep = await HttpPaymentService.createPaymentIntent(
      amounts.currentAmountCents,
      'eur',
      {
        type: 'deposit',
        conversationId: data.conversationId,
        clientId: data.clientId,
        aidantId: data.aidantId,
        serviceDetails: data.serviceDetails ?? null,
        totalAmount: total,
        depositAmount: amounts.depositAmountEur,
        depositRate: amounts.depositRate,
      }
    );

    // ✅ accepter les deux formats: client_secret (backend) OU clientSecret (autres)
    const clientSecret = dep.client_secret ?? (dep as any).clientSecret;
    if (!clientSecret) {
      return { success: false, error: 'Réponse serveur incomplète (acompte)' };
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    return { success: true, paymentIntentId: String(dep.id ?? '') };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message ?? "Erreur d'initialisation de l'acompte",
    };
  }
}

// ---------- PAIEMENT FINAL (80%) ----------
async function initializeFinalPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    const amounts = calculatePaymentAmounts(total, 'final', data.depositRate);

    const fin = await HttpPaymentService.createPaymentIntent(
      amounts.currentAmountCents,
      'eur',
      {
        type: 'final',
        conversationId: data.conversationId,
        clientId: data.clientId,
        aidantId: data.aidantId,
        totalAmount: total,
        finalAmount: amounts.finalAmountEur,
        depositRate: amounts.depositRate,
      }
    );

    const clientSecret = fin.client_secret ?? (fin as any).clientSecret;
    if (!clientSecret) {
      return { success: false, error: 'Réponse serveur incomplète (final)' };
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    return { success: true, paymentIntentId: String(fin.id ?? '') };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message ?? "Erreur d'initialisation du paiement final",
    };
  }
}

// ---------- PRÉSENTATION DU PAIEMENT ----------
async function presentPayment(): Promise<SimpleResult> {
  try {
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code === 'Canceled') {
        return { success: false, error: 'Paiement annulé' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message ?? 'Erreur de présentation du paiement',
    };
  }
}

async function confirmPayment(paymentIntentId: string): Promise<SimpleResult> {
  try {
    const paymentStatus = await HttpPaymentService.confirmPayment(paymentIntentId);

    if (paymentStatus.status !== 'succeeded') {
      return {
        success: false,
        error: `Statut de paiement invalide: ${paymentStatus.status}`,
      };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erreur de confirmation du paiement' };
  }
}

export const PaymentService = {
  initializeDepositPayment,
  initializeFinalPayment,
  presentPayment,
  presentPaymentSheet: presentPayment,
  confirmPayment,
};
