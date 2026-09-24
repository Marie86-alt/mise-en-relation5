export type PaymentType = 'deposit' | 'final';

export interface PaymentAmountBreakdown {
  totalAmountEur: number;
  depositAmountEur: number;
  finalAmountEur: number;
  currentAmountEur: number;
  currentAmountCents: number;
}

export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

export const eurosToCents = (amount: number) => Math.round(amount * 100);

export const calculatePaymentAmounts = (
  totalAmountEur: number,
  paymentType: PaymentType
): PaymentAmountBreakdown => {
  if (!Number.isFinite(totalAmountEur) || totalAmountEur <= 0) {
    throw new Error('Montant invalide');
  }

  const total = roundMoney(totalAmountEur);
  const depositAmountEur = roundMoney(total * 0.2);
  const finalAmountEur = roundMoney(total - depositAmountEur);
  const currentAmountEur = paymentType === 'deposit' ? depositAmountEur : finalAmountEur;

  return {
    totalAmountEur: total,
    depositAmountEur,
    finalAmountEur,
    currentAmountEur,
    currentAmountCents: eurosToCents(currentAmountEur),
  };
};
