import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeUserProfileUpdates } from '../frontend/src/contexts/authProfileUpdates.ts';
import {
  calculatePaymentAmounts,
  eurosToCents,
} from '../frontend/src/stripe/paymentAmounts.ts';
import {
  profileMatchesPreference,
  profileMatchesSecteur,
} from '../frontend/src/services/firebase/profileFilters.ts';
import { PricingService } from '../frontend/src/utils/pricing.ts';

test('pricing calculates special offer for 3 hours', () => {
  const result = PricingService.calculatePriceFromTimeRange('14:00', '17:00');

  assert.equal(result.error, undefined);
  assert.equal(result.hours, 3);
  assert.equal(result.basePrice, 66);
  assert.equal(result.finalPrice, 60);
});

test('pricing rejects duration under 2 hours', () => {
  const result = PricingService.calculatePriceFromTimeRange('09:00', '10:30');

  assert.match(result.error ?? '', /Dur/);
  assert.equal(result.finalPrice, 0);
});

test('payment amount breakdown uses 20 percent deposit and 80 percent final', () => {
  assert.equal(eurosToCents(12.34), 1234);

  const deposit = calculatePaymentAmounts(100, 'deposit');
  assert.equal(deposit.depositAmountEur, 20);
  assert.equal(deposit.finalAmountEur, 80);
  assert.equal(deposit.currentAmountCents, 2000);

  const final = calculatePaymentAmounts(100, 'final');
  assert.equal(final.currentAmountCents, 8000);
});

test('profile update sanitizer removes privileged fields', () => {
  const sanitized = sanitizeUserProfileUpdates({
    displayName: 'Marie',
    secteur: 'Menage',
    role: 'admin',
    isAdmin: true,
    isVerified: true,
  });

  assert.deepEqual(sanitized, {
    displayName: 'Marie',
    secteur: 'Menage',
  });
});

test('profile filters match secteur and preference locally', () => {
  const profile = {
    secteur: 'Aide a domicile',
    secteurs: ['Menage'],
    genre: 'Femme',
  };

  assert.equal(profileMatchesSecteur(profile, 'menage'), true);
  assert.equal(profileMatchesSecteur(profile, 'jardinage'), false);
  assert.equal(profileMatchesPreference(profile, 'femme'), true);
  assert.equal(profileMatchesPreference(profile, 'Indifferent'), true);
});
