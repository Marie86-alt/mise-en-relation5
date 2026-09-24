export interface PricingResult {
  hours: number;
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercentage: number;
  hourlyRate: number;
  error?: string;
}

const HOURLY_RATE = 22;
const SPECIAL_OFFERS: Record<number, number> = {
  3: 60,
};

const invalidResult = (error: string): PricingResult => ({
  hours: 0,
  basePrice: 0,
  finalPrice: 0,
  discount: 0,
  discountPercentage: 0,
  hourlyRate: HOURLY_RATE,
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
  static calculatePrice(hours: number): PricingResult {
    if (typeof hours !== 'number' || Number.isNaN(hours) || hours <= 0) {
      return invalidResult(`Duree invalide: ${hours}. Doit etre un nombre positif.`);
    }

    if (hours < 2) {
      return invalidResult(`Duree minimum de 2 heures requise. Duree actuelle: ${hours}h`);
    }

    const basePrice = hours * HOURLY_RATE;
    const wholeHours = Math.floor(hours);
    const specialPrice = SPECIAL_OFFERS[wholeHours];

    if (specialPrice && hours === wholeHours) {
      const discount = basePrice - specialPrice;
      return {
        hours,
        basePrice,
        finalPrice: specialPrice,
        discount,
        discountPercentage: Math.round((discount / basePrice) * 100),
        hourlyRate: HOURLY_RATE,
      };
    }

    return {
      hours,
      basePrice,
      finalPrice: basePrice,
      discount: 0,
      discountPercentage: 0,
      hourlyRate: HOURLY_RATE,
    };
  }

  static calculatePriceFromTimeRange(startTime: string, endTime: string): PricingResult {
    if (!startTime || !endTime) {
      return invalidResult('Heures de debut et de fin requises');
    }

    const start = parseTimeToDate(startTime);
    const end = parseTimeToDate(endTime);

    if (!start || !end) {
      return invalidResult("Format d'heure invalide");
    }

    if (end <= start) {
      return invalidResult("L'heure de fin doit etre apres l'heure de debut");
    }

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (Number.isNaN(hours) || hours <= 0) {
      return invalidResult(`Duree invalide calculee: ${hours}h`);
    }

    if (hours < 2) {
      return invalidResult(`Duree minimum de 2 heures requise. Duree actuelle: ${hours.toFixed(2)}h`);
    }

    return this.calculatePrice(hours);
  }

  static calculatePriceFromTimeRangeSafe(
    startTime: string,
    endTime: string,
    minimalHours = 1
  ): PricingResult {
    const result = this.calculatePriceFromTimeRange(startTime, endTime);

    if (result.error && minimalHours > 0) {
      const fallback = this.calculatePrice(minimalHours);
      return { ...fallback, error: result.error };
    }

    return result;
  }

  static formatPrice(price: number): string {
    if (typeof price !== 'number' || Number.isNaN(price)) {
      return '0,00 EUR';
    }

    return `${price.toFixed(2).replace('.', ',')} EUR`;
  }

  static getPricingSummary(pricingResult: PricingResult): string {
    const { hours, basePrice, finalPrice, discount, discountPercentage } = pricingResult;

    if (Number.isNaN(hours) || Number.isNaN(finalPrice)) {
      return 'Prix non disponible';
    }

    if (discount > 0) {
      return `${hours}h -> ${this.formatPrice(finalPrice)} (au lieu de ${this.formatPrice(basePrice)}) - Economie : ${this.formatPrice(discount)} (${discountPercentage}%)`;
    }

    return `${hours}h -> ${this.formatPrice(finalPrice)}`;
  }

  static calculateCommission(finalPrice: number): {
    helperAmount: number;
    appCommission: number;
    commissionRate: number;
  } {
    const commissionRate = 0.4;

    if (typeof finalPrice !== 'number' || Number.isNaN(finalPrice) || finalPrice < 0) {
      return {
        helperAmount: 0,
        appCommission: 0,
        commissionRate,
      };
    }

    const appCommission = finalPrice * commissionRate;
    return {
      helperAmount: finalPrice - appCommission,
      appCommission,
      commissionRate,
    };
  }
}
