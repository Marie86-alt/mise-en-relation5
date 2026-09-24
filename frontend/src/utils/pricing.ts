// src/utils/pricing.ts
// Calculs de prix. Toutes les méthodes acceptent une configuration (voir pricingConfig.ts) ;
// sans argument, les valeurs par défaut s'appliquent.
// Extension explicite : ce module est aussi exécuté par Node (tests) qui ne la déduit pas.
import { DEFAULT_PRICING, type PricingConfig } from '../config/pricingConfig.ts';

export interface PricingResult {
  hours: number;
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercentage: number;
  hourlyRate: number;
  error?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const invalidResult = (error: string, config: PricingConfig): PricingResult => ({
  hours: 0,
  basePrice: 0,
  finalPrice: 0,
  discount: 0,
  discountPercentage: 0,
  hourlyRate: config.hourlyRate,
  error,
});

const isValidTimeFormat = (timeString: string): boolean => {
  if (!timeString || typeof timeString !== 'string') return false;

  const cleanTime = timeString.trim();
  const colonFormat = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const hFormat = /^([0-1]?[0-9]|2[0-3])[hH][0-5][0-9]$/;
  return colonFormat.test(cleanTime) || hFormat.test(cleanTime);
};

const parseTimeToDate = (timeString: string): Date | null => {
  if (!isValidTimeFormat(timeString)) return null;

  let cleanTime = timeString.trim();
  if (/^([0-1]?[0-9]|2[0-3])[hH][0-5][0-9]$/.test(cleanTime)) {
    cleanTime = cleanTime.replace(/[hH]/, ':');
  }

  const date = new Date(`2000-01-01T${cleanTime}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export class PricingService {
  static calculatePrice(hours: number, config: PricingConfig = DEFAULT_PRICING): PricingResult {
    if (typeof hours !== 'number' || Number.isNaN(hours) || hours <= 0) {
      return invalidResult(`Durée invalide : ${hours}. Doit être un nombre positif.`, config);
    }

    if (hours < config.minHours) {
      return invalidResult(
        `Durée minimum de ${config.minHours} heures requise. Durée actuelle : ${hours}h`,
        config
      );
    }

    const basePrice = round2(hours * config.hourlyRate);
    const wholeHours = Math.floor(hours);
    const specialPrice = config.specialOffers[wholeHours];

    if (specialPrice !== undefined && hours === wholeHours && specialPrice < basePrice) {
      const discount = round2(basePrice - specialPrice);
      return {
        hours,
        basePrice,
        finalPrice: specialPrice,
        discount,
        discountPercentage: Math.round((discount / basePrice) * 100),
        hourlyRate: config.hourlyRate,
      };
    }

    return {
      hours,
      basePrice,
      finalPrice: basePrice,
      discount: 0,
      discountPercentage: 0,
      hourlyRate: config.hourlyRate,
    };
  }

  static calculatePriceFromTimeRange(
    startTime: string,
    endTime: string,
    config: PricingConfig = DEFAULT_PRICING
  ): PricingResult {
    if (!startTime || !endTime) {
      return invalidResult('Heures de début et de fin requises', config);
    }

    const start = parseTimeToDate(startTime);
    const end = parseTimeToDate(endTime);

    if (!start || !end) {
      return invalidResult("Format d'heure invalide", config);
    }

    if (end <= start) {
      return invalidResult("L'heure de fin doit être après l'heure de début", config);
    }

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (Number.isNaN(hours) || hours <= 0) {
      return invalidResult(`Durée invalide calculée : ${hours}h`, config);
    }

    if (hours < config.minHours) {
      return invalidResult(
        `Durée minimum de ${config.minHours} heures requise. Durée actuelle : ${hours.toFixed(2)}h`,
        config
      );
    }

    return this.calculatePrice(hours, config);
  }

  static calculatePriceFromTimeRangeSafe(
    startTime: string,
    endTime: string,
    minimalHours = 1,
    config: PricingConfig = DEFAULT_PRICING
  ): PricingResult {
    const result = this.calculatePriceFromTimeRange(startTime, endTime, config);

    if (result.error && minimalHours > 0) {
      const fallback = this.calculatePrice(minimalHours, config);
      return { ...fallback, error: result.error };
    }

    return result;
  }

  static formatPrice(price: number): string {
    if (typeof price !== 'number' || Number.isNaN(price)) {
      return '0,00 €';
    }

    return `${price.toFixed(2).replace('.', ',')} €`;
  }

  static getPricingSummary(pricingResult: PricingResult): string {
    const { hours, basePrice, finalPrice, discount, discountPercentage } = pricingResult;

    if (Number.isNaN(hours) || Number.isNaN(finalPrice)) {
      return 'Prix non disponible';
    }

    if (discount > 0) {
      return `${hours}h -> ${this.formatPrice(finalPrice)} (au lieu de ${this.formatPrice(basePrice)}) - Économie : ${this.formatPrice(discount)} (${discountPercentage}%)`;
    }

    return `${hours}h -> ${this.formatPrice(finalPrice)}`;
  }

  static calculateCommission(
    finalPrice: number,
    config: PricingConfig = DEFAULT_PRICING
  ): {
    helperAmount: number;
    appCommission: number;
    commissionRate: number;
  } {
    const commissionRate = config.commissionRate;

    if (typeof finalPrice !== 'number' || Number.isNaN(finalPrice) || finalPrice < 0) {
      return { helperAmount: 0, appCommission: 0, commissionRate };
    }

    const appCommission = round2(finalPrice * commissionRate);
    return {
      helperAmount: round2(finalPrice - appCommission),
      appCommission,
      commissionRate,
    };
  }
}
