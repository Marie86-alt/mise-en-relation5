// src/config/pricingConfig.ts
// Paramètres tarifaires de la plateforme. La source de vérité est le document Firestore
// `config/pricing` (modifiable par un administrateur depuis l'app) ; ces valeurs par défaut
// servent de repli tant que le document n'est pas chargé ou n'existe pas.
//
// Module volontairement sans dépendance (ni Firebase, ni alias '@/') : il est partagé avec
// les tests Node et doit rester importable partout.

export interface PricingConfig {
  /** Tarif horaire en euros */
  hourlyRate: number;
  /** Durée minimale d'un service, en heures */
  minHours: number;
  /** Prix forfaitaires : nombre d'heures (entier) → prix total en euros */
  specialOffers: Record<number, number>;
  /** Part versée à la réservation (0,20 = 20 %) */
  depositRate: number;
  /** Part conservée par la plateforme (0,40 = 40 %) */
  commissionRate: number;
  currency: string;
}

export const PRICING_COLLECTION = 'config';
export const PRICING_DOC_ID = 'pricing';

export const DEFAULT_PRICING: PricingConfig = {
  hourlyRate: 22,
  minHours: 2,
  specialOffers: { 3: 60 },
  depositRate: 0.2,
  commissionRate: 0.4,
  currency: 'EUR',
};

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const numberIn = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return isFiniteNumber(n) && n >= min && n <= max ? n : fallback;
};

/**
 * Nettoie un document `config/pricing` brut : chaque champ invalide retombe sur la valeur par
 * défaut, pour qu'une faute de saisie côté admin ne casse jamais le calcul des prix.
 */
export function sanitizePricingConfig(raw: unknown): PricingConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const hourlyRate = numberIn(src.hourlyRate, 1, 500, DEFAULT_PRICING.hourlyRate);
  const minHours = Math.max(1, Math.round(numberIn(src.minHours, 1, 12, DEFAULT_PRICING.minHours)));
  const depositRate = numberIn(src.depositRate, 0.01, 0.99, DEFAULT_PRICING.depositRate);
  const commissionRate = numberIn(src.commissionRate, 0, 0.99, DEFAULT_PRICING.commissionRate);
  const currency = typeof src.currency === 'string' && /^[A-Z]{3}$/.test(src.currency) ? src.currency : DEFAULT_PRICING.currency;

  const specialOffers: Record<number, number> = {};
  const offersSrc = src.specialOffers && typeof src.specialOffers === 'object' ? (src.specialOffers as Record<string, unknown>) : null;
  if (offersSrc) {
    for (const [key, value] of Object.entries(offersSrc)) {
      const hours = Number(key);
      const price = numberIn(value, 1, 100000, NaN);
      // Une « offre » plus chère que le tarif normal n'en est pas une : ignorée.
      if (Number.isInteger(hours) && hours >= minHours && Number.isFinite(price) && price < hours * hourlyRate) {
        specialOffers[hours] = price;
      }
    }
  } else if (raw === undefined || raw === null) {
    Object.assign(specialOffers, DEFAULT_PRICING.specialOffers);
  }

  return { hourlyRate, minHours, specialOffers, depositRate, commissionRate, currency };
}

/** Pourcentage lisible : 0,2 → « 20 % » */
export const formatRate = (rate: number) => `${Math.round(rate * 100)} %`;
