// Extension explicite : ce module est aussi exécuté par Node (tests) qui ne la déduit pas.
import { DEFAULT_PRICING } from '../config/pricingConfig.ts';

export type PaymentType = 'deposit' | 'final';

export interface PaymentAmountBreakdown {
  totalAmountEur: number;
  depositAmountEur: number;
  finalAmountEur: number;
  currentAmountEur: number;
  currentAmountCents: number;
  /** Taux d'acompte effectivement appliqué (transmis au serveur pour traçabilité) */
  depositRate: number;
}

export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

export const eurosToCents = (amount: number) => Math.round(amount * 100);

/**
 * Répartition acompte / solde. Le solde est toujours le complément exact de l'acompte,
 * ce qui garantit acompte + solde = total au centime (même logique que le backend).
 */
export const calculatePaymentAmounts = (
  totalAmountEur: number,
  paymentType: PaymentType,
  depositRate: number = DEFAULT_PRICING.depositRate
): PaymentAmountBreakdown => {
  if (!Number.isFinite(totalAmountEur) || totalAmountEur <= 0) {
    throw new Error('Montant invalide');
  }
  const rate = Number.isFinite(depositRate) && depositRate > 0 && depositRate < 1 ? depositRate : DEFAULT_PRICING.depositRate;

  const total = roundMoney(totalAmountEur);
  const depositAmountEur = roundMoney(total * rate);
  const finalAmountEur = roundMoney(total - depositAmountEur);
  const currentAmountEur = paymentType === 'deposit' ? depositAmountEur : finalAmountEur;

  return {
    totalAmountEur: total,
    depositAmountEur,
    finalAmountEur,
    currentAmountEur,
    currentAmountCents: eurosToCents(currentAmountEur),
    depositRate: rate,
  };
};
