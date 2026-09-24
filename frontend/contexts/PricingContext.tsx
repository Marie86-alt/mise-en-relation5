// contexts/PricingContext.tsx
// Expose la configuration tarifaire (Firestore `config/pricing`) à toute l'application.
// Tant que rien n'est chargé — ou si le document est absent — les valeurs par défaut s'appliquent.
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { DEFAULT_PRICING, type PricingConfig } from '@/src/config/pricingConfig';
import { subscribePricingConfig, type PricingConfigMeta } from '@/src/services/firebase/pricingConfigService';

interface PricingContextValue {
  pricing: PricingConfig;
  /** Première lecture en cours */
  loading: boolean;
  /** Le document `config/pricing` existe (sinon valeurs par défaut) */
  exists: boolean;
  /** Valeurs par défaut utilisées faute de pouvoir joindre Firestore */
  isFallback: boolean;
  updatedAt: Date | null;
}

const PricingContext = createContext<PricingContextValue | undefined>(undefined);

export const usePricing = (): PricingContextValue => {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('usePricing doit être utilisé dans un PricingProvider');
  return ctx;
};

export const PricingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [meta, setMeta] = useState<PricingConfigMeta>({ exists: false, fromServer: false });
  const [loading, setLoading] = useState(true);

  // Les règles Firestore n'ouvrent la lecture qu'aux utilisateurs connectés.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribePricingConfig((config, m) => {
      setPricing(config);
      setMeta(m);
      setLoading(false);
    });
    return unsubscribe;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<PricingContextValue>(
    () => ({
      pricing,
      loading,
      exists: meta.exists,
      isFallback: !meta.fromServer,
      updatedAt: meta.updatedAt ?? null,
    }),
    [pricing, loading, meta]
  );

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
};
