// src/stripe/httpPaymentService.ts
import { STRIPE_CONFIG, STRIPE_ENDPOINTS } from '../config/stripe';

export interface HttpPaymentRequest {
  amount: number;
  currency: string;
  metadata: Record<string, any>;
}

export interface HttpPaymentResponse {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export class HttpPaymentService {
  private static async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const url = STRIPE_CONFIG.BACKEND_URL + endpoint;
    
    console.log('🔍 Requête HTTP vers:', url);
    console.log('📤 Données envoyées:', data);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('📥 Réponse status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erreur HTTP:', errorText);
      throw new Error(`Impossible de traiter le paiement`);
    }

    const result = await response.json();
    console.log('✅ Réponse reçue:', result);
    
    return result as T;
  }

  static async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    metadata: Record<string, any> = {}
  ): Promise<HttpPaymentResponse> {
    // Convertir tous les objets en strings pour Stripe
    const stripeMetadata: Record<string, string> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        stripeMetadata[key] = JSON.stringify(value);
      } else {
        stripeMetadata[key] = String(value);
      }
    });

    // Ajouter les métadonnées système
    stripeMetadata.source = 'mise-en-relation-app';
    stripeMetadata.timestamp = new Date().toISOString();

    return await this.makeRequest<HttpPaymentResponse>(
      STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT,
      {
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        metadata: stripeMetadata,
      }
    );
  }

  static async confirmPayment(paymentIntentId: string): Promise<any> {
    return await this.makeRequest(
      STRIPE_ENDPOINTS.CONFIRM_PAYMENT,
      {
        paymentIntentId,
      }
    );
  }
}