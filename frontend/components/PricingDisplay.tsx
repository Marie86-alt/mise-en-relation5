// components/PricingDisplay.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PricingService, PricingResult } from '../src/utils/pricing';
import { Colors } from '../constants/Colors';

interface PricingDisplayProps {
  startTime?: string;
  endTime?: string;
  hours?: number;
  showCommission?: boolean;
  style?: any;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  startTime,
  endTime,
  hours,
  showCommission = false,
  style
}) => {
  // Calculer le prix
  const getPricing = (): PricingResult => {
    if (startTime && endTime) {
      try {
        return PricingService.calculatePriceFromTimeRange(startTime, endTime);
      } catch (error) {
        console.error('Erreur calcul prix:', error);
        return PricingService.calculatePrice(0);
      }
    } else if (hours) {
      return PricingService.calculatePrice(hours);
    }
    return PricingService.calculatePrice(0);
  };

  const pricing = getPricing();
  const commission = showCommission ? PricingService.calculateCommission(pricing.finalPrice) : null;

  if (pricing.hours === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.selectTime}>Sélectionnez une durée pour voir le prix</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* 🕐 Durée */}
      <View style={styles.row}>
        <Text style={styles.label}>Durée :</Text>
        <Text style={styles.value}>{pricing.hours}h</Text>
      </View>

      {/* 💰 Prix de base */}
      <View style={styles.row}>
        <Text style={styles.label}>Taux horaire :</Text>
        <Text style={styles.value}>{PricingService.formatPrice(pricing.hourlyRate)}/h</Text>
      </View>

      {/* 🎁 Réduction (si applicable) */}
      {pricing.discount > 0 && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Prix normal :</Text>
            <Text style={[styles.value, styles.crossed]}>
              {PricingService.formatPrice(pricing.basePrice)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.discountLabel}>Réduction ({pricing.discountPercentage}%) :</Text>
            <Text style={styles.discountValue}>
              -{PricingService.formatPrice(pricing.discount)}
            </Text>
          </View>
        </>
      )}

      {/* 💳 Prix final */}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total à payer :</Text>
        <Text style={styles.totalValue}>
          {PricingService.formatPrice(pricing.finalPrice)}
        </Text>
      </View>

      {/* 📊 Répartition commission (si demandée) */}
      {showCommission && commission && (
        <View style={styles.commissionSection}>
          <Text style={styles.commissionTitle}>Répartition :</Text>
          <View style={styles.row}>
            <Text style={styles.commissionLabel}>Aidant reçoit :</Text>
            <Text style={styles.commissionValue}>
              {PricingService.formatPrice(commission.helperAmount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.commissionLabel}>Commission app :</Text>
            <Text style={styles.commissionValue}>
              {PricingService.formatPrice(commission.appCommission)} ({Math.round(commission.commissionRate * 100)}%)
            </Text>
          </View>
        </div>
      )}

      {/* ✨ Message d'économie */}
      {pricing.discount > 0 && (
        <View style={styles.savingsBox}>
          <Text style={styles.savingsText}>
            🎉 Vous économisez {PricingService.formatPrice(pricing.discount)} !
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 16,
  },

  selectTime: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    fontSize: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    color: '#495057',
  },

  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },

  crossed: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },

  discountLabel: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },

  discountValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },

  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    marginBottom: 0,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },

  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },

  commissionSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },

  commissionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },

  commissionLabel: {
    fontSize: 13,
    color: '#6c757d',
  },

  commissionValue: {
    fontSize: 13,
    color: '#495057',
  },

  savingsBox: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },

  savingsText: {
    textAlign: 'center',
    color: '#155724',
    fontWeight: '500',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});