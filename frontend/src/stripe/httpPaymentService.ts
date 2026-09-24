import { auth } from '@/firebase.config';
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

export interface HttpPaymentStatusResponse {
  id: string;
  amount?: number;
  currency?: string;
  status: string;
  client_secret?: string;
  clientSecret?: string;
}

export class HttpPaymentService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const currentUser = auth.currentUser;
    if (!currentUser) return {};

    try {
      const token = await currentUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }

  private static async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(STRIPE_CONFIG.BACKEND_URL + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders()),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (__DEV__) {
        console.warn('Payment API error', {
          endpoint,
          status: response.status,
          body: errorText,
        });
      }
      throw new Error('Impossible de traiter le paiement');
    }

    return (await response.json()) as T;
  }

  static async createPaymentIntent(
    amount: number,
    currency: string = 'eur',
    metadata: Record<string, any> = {}
  ): Promise<HttpPaymentResponse> {
    const stripeMetadata: Record<string, string> = {};

    Object.entries(metadata).forEach(([key, value]) => {
      stripeMetadata[key] =
        typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    });

    stripeMetadata.source = 'mise-en-relation-app';
    stripeMetadata.timestamp = new Date().toISOString();

    return await this.makeRequest<HttpPaymentResponse>(
      STRIPE_ENDPOINTS.CREATE_PAYMENT_INTENT,
      {
        amount,
        currency,
        metadata: stripeMetadata,
      }
    );
  }

  static async confirmPayment(paymentIntentId: string): Promise<HttpPaymentStatusResponse> {
    return await this.makeRequest(STRIPE_ENDPOINTS.CONFIRM_PAYMENT, {
      paymentIntentId,
    });
  }

  static async getPaymentStatus(paymentIntentId: string): Promise<HttpPaymentStatusResponse> {
    return await this.makeRequest(STRIPE_ENDPOINTS.GET_PAYMENT_STATUS, {
      paymentIntentId,
    });
  }
}
