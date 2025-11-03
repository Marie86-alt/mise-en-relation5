// src/services/stripe/paymentService.ts
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { PricingResult } from '../utils/pricing';
import { HttpPaymentService } from './httpPaymentService';

// Import conditionnel de Stripe (uniquement sur mobile)
let initPaymentSheet: any;
let presentPaymentSheet: any;

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  initPaymentSheet = stripe.initPaymentSheet;
  presentPaymentSheet = stripe.presentPaymentSheet;
}

// --- Types alignés avec tes écrans ---
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
}

type InitResult = { success: true; paymentIntentId?: string } | { success: false; error: string; errorCode?: string };
type SimpleResult = { success: true } | { success: false; error: string };

const RETURN_URL = Linking.createURL('payment-return');
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- ACOMPTE (20%) ----------
async function initializeDepositPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    // Calculer l'acompte (20% du total)
    const depositAmount = r2(total * 0.2);

    console.log('💳 Création acompte:', { total, depositAmount });

    // Appel HTTP vers votre serveur Express
    const dep = await HttpPaymentService.createPaymentIntent(
      depositAmount,
      'eur',
      {
        type: 'deposit',
        conversationId: data.conversationId,
        serviceDetails: data.serviceDetails ?? null,
        totalAmount: total,
        depositAmount,
      }
    );

    if (!dep?.client_secret || !dep?.id) {
      return { success: false, error: 'Réponse serveur incomplète (acompte)' };
    }

    console.log('🔄 Initialisation du Payment Sheet...');
    console.log('🔑 Client Secret:', dep.client_secret?.substring(0, 20) + '...');
    
    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: dep.client_secret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });
    
    if (error) {
      console.log('❌ Erreur initPaymentSheet:', error);
      return { success: false, error: error.message, errorCode: error.code };
    }
    
    console.log('✅ Payment Sheet initialisé avec succès');

    return { success: true, paymentIntentId: String(dep.id) };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur d'initialisation de l'acompte" };
  }
}

// ---------- PAIEMENT FINAL (80%) ----------
async function initializeFinalPayment(data: PaymentData): Promise<InitResult> {
  try {
    const total = Number(data.pricingData?.finalPrice || 0);
    if (!total || total <= 0) throw new Error('Montant invalide');

    // Calculer le paiement final (80% du total)
    const finalAmount = r2(total * 0.8);

    console.log('💳 Création paiement final:', { total, finalAmount });

    // Cas limite: rien à payer
    if (finalAmount <= 0) {
      return { success: true, paymentIntentId: undefined };
    }

    // Appel HTTP vers votre serveur Express
    const fin = await HttpPaymentService.createPaymentIntent(
      finalAmount,
      'eur',
      {
        type: 'final',
        conversationId: data.conversationId,
        totalAmount: total,
        finalAmount,
      }
    );

    if (!fin?.client_secret || !fin?.id) {
      return { success: false, error: 'Réponse serveur incomplète (final)' };
    }

    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: fin.client_secret,
      merchantDisplayName: 'Mise en Relation',
      allowsDelayedPaymentMethods: false,
      returnURL: RETURN_URL,
    });
    if (error) return { success: false, error: error.message, errorCode: error.code };

    return { success: true, paymentIntentId: String(fin.id) };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur d'initialisation du paiement final" };
  }
}

// ---------- PRÉSENTATION DU PAIEMENT ----------
async function presentPayment(): Promise<SimpleResult> {
  try {
    console.log('🎬 Appel de presentPaymentSheet() de Stripe...');
    const { error } = await presentPaymentSheet();
    
    if (error) {
      console.log('❌ Erreur Stripe presentPaymentSheet:', { 
        code: error.code, 
        message: error.message,
        type: error.type 
      });
      
      if (error.code === 'Canceled') {
        console.log('ℹ️ Paiement annulé par l\'utilisateur');
        return { success: false, error: 'Paiement annulé' };
      }
      return { success: false, error: error.message };
    }
    
    console.log('✅ presentPaymentSheet réussi !');
    return { success: true };
  } catch (e: any) {
    console.log('❌ Exception dans presentPayment:', e);
    return { success: false, error: e?.message ?? 'Erreur de présentation du paiement' };
  }
}

// ---------- EXPORTS PUBLICS ----------
export const PaymentService = {
  initializeDepositPayment,
  initializeFinalPayment,
  presentPayment,
};