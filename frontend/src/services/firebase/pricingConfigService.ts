// src/services/firebase/pricingConfigService.ts
// Lecture temps réel et écriture (admin) du document Firestore `config/pricing`.
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';
import {
  DEFAULT_PRICING,
  PRICING_COLLECTION,
  PRICING_DOC_ID,
  sanitizePricingConfig,
  type PricingConfig,
} from '../../config/pricingConfig';
import ErrorService from '../errorService';

export interface PricingConfigMeta {
  /** Le document existe dans Firestore */
  exists: boolean;
  /** Valeurs reçues du serveur (false = repli sur les valeurs par défaut après une erreur) */
  fromServer: boolean;
  updatedAt?: Date | null;
}

const pricingRef = () => doc(db, PRICING_COLLECTION, PRICING_DOC_ID);

export const subscribePricingConfig = (
  onChange: (config: PricingConfig, meta: PricingConfigMeta) => void
) =>
  onSnapshot(
    pricingRef(),
    (snap) => {
      const data = snap.exists() ? snap.data() : undefined;
      const updatedAt = typeof data?.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : null;
      onChange(snap.exists() ? sanitizePricingConfig(data) : DEFAULT_PRICING, {
        exists: snap.exists(),
        fromServer: true,
        updatedAt,
      });
    },
    (error) => {
      ErrorService.logError('PRICING_CONFIG', error.message, error.code, 'warning');
      onChange(DEFAULT_PRICING, { exists: false, fromServer: false });
    }
  );

/** Enregistre la configuration (réservé aux administrateurs par les règles Firestore). */
export const savePricingConfig = async (config: PricingConfig, adminUid: string): Promise<void> => {
  const clean = sanitizePricingConfig(config);
  // Firestore n'accepte que des clés de type chaîne dans une map
  const specialOffers: Record<string, number> = {};
  for (const [hours, price] of Object.entries(clean.specialOffers)) specialOffers[String(hours)] = price;

  await setDoc(
    pricingRef(),
    {
      hourlyRate: clean.hourlyRate,
      minHours: clean.minHours,
      specialOffers,
      depositRate: clean.depositRate,
      commissionRate: clean.commissionRate,
      currency: clean.currency,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: false }
  );
};
