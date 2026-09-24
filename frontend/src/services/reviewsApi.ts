// src/services/reviewsApi.ts
// Avis clients : enregistrés par le backend (POST /api/reviews), qui vérifie l'auteur et recalcule
// la note de l'aidant. L'application n'écrit plus les notes elle-même.
import { auth } from '@/firebase.config';
import { STRIPE_CONFIG } from '@/src/config/stripe';

export interface ReviewPayload {
  aidantId: string;
  conversationId: string;
  rating: number;
  comment?: string;
  clientName?: string;
  serviceDate?: string;
  secteur?: string;
  dureeService?: number;
  montantService?: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewResult extends ReviewStats {
  reviewId: string;
  created: boolean;
}

const ERROR_MESSAGES: Record<number, string> = {
  401: 'Vous devez être connecté pour laisser un avis.',
  403: 'Seul le client de ce service peut laisser un avis.',
  404: 'Conversation introuvable.',
  409: 'Le service doit être terminé avant de pouvoir être évalué.',
  503: 'Service momentanément indisponible, réessayez dans quelques instants.',
};

async function authHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Vous devez être connecté.');
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  // STRIPE_CONFIG.BACKEND_URL contient déjà le préfixe /api
  const response = await fetch(`${STRIPE_CONFIG.BACKEND_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json())?.detail ?? '';
    } catch {
      /* corps non JSON */
    }
    if (__DEV__) console.warn('reviewsApi', path, response.status, detail);
    throw new Error(ERROR_MESSAGES[response.status] ?? "L'avis n'a pas pu être enregistré. Réessayez.");
  }
  return (await response.json()) as T;
}

export const reviewsApi = {
  /** Dépose (ou remplace) l'avis du client pour une conversation terminée. */
  submitReview: (payload: ReviewPayload) => post<ReviewResult>('/reviews', payload),

  /** Admin : recalcule la note d'un aidant, ou de tous les aidants si `aidantId` est omis. */
  recomputeStats: (aidantId?: string) =>
    post<{ aidants: number } & Partial<ReviewStats>>('/reviews/recompute', aidantId ? { aidantId } : {}),
};
