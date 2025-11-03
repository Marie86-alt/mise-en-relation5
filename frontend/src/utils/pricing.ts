// src/utils/pricing.ts
export interface PricingResult {
  hours: number;
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercentage: number;
  hourlyRate: number;
}

export class PricingService {
  // 🎯 Taux horaire fixe
  private static readonly HOURLY_RATE = 22;
  
  // 🎁 Réductions spéciales
  private static readonly SPECIAL_OFFERS = {
    3: 60, // 3h = 60€ au lieu de 66€
    // Vous pouvez ajouter d'autres offres :
    // 5: 100, // 5h = 100€ au lieu de 110€
    // 8: 160, // 8h = 160€ au lieu de 176€
  };

  /**
   * 🛡️ Valide le format d'une heure (HH:MM ou HHhMM)
   */
  private static isValidTimeFormat(timeString: string): boolean {
    if (!timeString || typeof timeString !== 'string') {
      return false;
    }
    
    const cleanTime = timeString.trim();
    
    // Format HH:MM (ex: "10:00", "14:30")
    const colonFormat = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    // Format HHhMM (ex: "10h00", "14h30", "10H00")
    const hFormat = /^([0-1]?[0-9]|2[0-3])[hH][0-5][0-9]$/;
    
    return colonFormat.test(cleanTime) || hFormat.test(cleanTime);
  }

  /**
   * 🛡️ Convertit une chaîne d'heure en objet Date sécurisé
   */
  private static parseTimeToDate(timeString: string): Date | null {
    if (!this.isValidTimeFormat(timeString)) {
      console.log(`🔍 Format d'heure invalide: "${timeString}". Attendu: HH:MM ou HHhMM`);
      return null;
    }
    
    let cleanTime = timeString.trim();
    
    // Convertir "10h00" en "10:00" pour le parsing
    if (/^([0-1]?[0-9]|2[0-3])[hH][0-5][0-9]$/.test(cleanTime)) {
      cleanTime = cleanTime.replace(/[hH]/, ':');
    }
    
    const date = new Date(`2000-01-01T${cleanTime}:00`);
    
    if (isNaN(date.getTime())) {
      console.log(`🔍 Impossible de parser l'heure: "${timeString}"`);
      return null;
    }
    
    return date;
  }

  /**
   * Calcule le prix total selon la durée
   */
  static calculatePrice(hours: number): PricingResult | { error: string } {
    // 🛡️ Validation de l'entrée
    if (typeof hours !== 'number' || isNaN(hours) || hours <= 0) {
      return { error: `Durée invalide: ${hours}. Doit être un nombre positif.` };
    }

    // 🛡️ Validation durée minimum de 2 heures
    if (hours < 2) {
      return { error: `Durée minimum de 2 heures requise. Durée actuelle: ${hours}h` };
    }

    const basePrice = hours * this.HOURLY_RATE;
   
    // Vérifier s'il y a une offre spéciale (seulement pour les heures entières)
    const wholeHours = Math.floor(hours);
    const specialPrice = this.SPECIAL_OFFERS[wholeHours as keyof typeof this.SPECIAL_OFFERS];
   
    if (specialPrice && hours === wholeHours) {
      const discount = basePrice - specialPrice;
      const discountPercentage = Math.round((discount / basePrice) * 100);
     
      return {
        hours,
        basePrice,
        finalPrice: specialPrice,
        discount,
        discountPercentage,
        hourlyRate: this.HOURLY_RATE
      };
    }
    
    // Pas d'offre spéciale = prix normal
    return {
      hours,
      basePrice,
      finalPrice: basePrice,
      discount: 0,
      discountPercentage: 0,
      hourlyRate: this.HOURLY_RATE
    };
  }

  /**
   * 🔧 Calcule le prix à partir d'heures de début/fin (VERSION SÉCURISÉE)
   */
  static calculatePriceFromTimeRange(startTime: string, endTime: string): PricingResult | { error: string } {
      // 🛡️ Validation des entrées
      if (!startTime || !endTime) {
        console.log('🔍 Heures de début et de fin requises');
        return {
          hours: 0,
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountPercentage: 0,
          hourlyRate: this.HOURLY_RATE
        };
      }

      console.log('🔍 Calcul pricing pour:', { startTime, endTime });

      // 🛡️ Parsing sécurisé des heures
      const start = this.parseTimeToDate(startTime);
      const end = this.parseTimeToDate(endTime);

      if (!start || !end) {
        console.log('🔍 Erreur parsing des heures');
        return { error: 'Format d\'heure invalide' };
      }

      console.log('✅ Heures parsées:', { 
        start: start.toTimeString(), 
        end: end.toTimeString() 
      });

      // 🛡️ Vérification que l'heure de fin est après le début
      if (end <= start) {
        console.log('🔍 L\'heure de fin doit être après l\'heure de début');
        return {
          hours: 0,
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountPercentage: 0,
          hourlyRate: this.HOURLY_RATE
        };
      }

      // 🧮 Calcul de la durée en heures
      const diffMs = end.getTime() - start.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      console.log('🕐 Durée calculée:', { 
        diffMs, 
        hours: hours.toFixed(2) 
      });

      // 🛡️ Validation du résultat
      if (isNaN(hours) || hours <= 0) {
        console.log(`🔍 Durée invalide calculée: ${hours}h`);
        return {
          hours: 0,
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountPercentage: 0,
          hourlyRate: this.HOURLY_RATE
        };
      }
      // 🛡️ Validation durée minimum (2 heures)
      if (hours < 2) {
        console.log(`🔍 Durée minimum de 2 heures requise. Durée actuelle: ${hours.toFixed(2)}h`);
        return {
          hours: 0,
          basePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountPercentage: 0,
          hourlyRate: this.HOURLY_RATE
        };
      }

      const result = this.calculatePrice(hours);
      
      console.log('💰 Pricing final:', result);
      
      // Check if calculatePrice returned an error
      if ('error' in result) {
        return result;
      }
      
      return result;
  }

  /**
   * 🛡️ Version fallback qui retourne un prix par défaut en cas d'erreur
   */
  static calculatePriceFromTimeRangeSafe(startTime: string, endTime: string, minimalHours = 1): PricingResult | { error: string } {
    // Plus besoin de try/catch car calculatePriceFromTimeRange ne lance plus d'exceptions
    const result = this.calculatePriceFromTimeRange(startTime, endTime);
    return result;
  }

  /**
   * Formate le prix pour l'affichage
   */
  static formatPrice(price: number): string {
    // 🛡️ Validation
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn('⚠️ Prix invalide pour formatage:', price);
      return '0,00€';
    }
    
    return `${price.toFixed(2).replace('.', ',')}€`;
  }

  /**
   * Génère un résumé de prix lisible
   */
  static getPricingSummary(pricingResult: PricingResult): string {
    try {
      const { hours, basePrice, finalPrice, discount, discountPercentage } = pricingResult;
   
      // 🛡️ Validation des données
      if (isNaN(hours) || isNaN(finalPrice)) {
        return 'Prix non disponible';
      }

      if (discount > 0) {
        return `${hours}h → ${this.formatPrice(finalPrice)} (au lieu de ${this.formatPrice(basePrice)}) - Économie : ${this.formatPrice(discount)} (${discountPercentage}%)`;
      }
   
      return `${hours}h → ${this.formatPrice(finalPrice)}`;
    } catch (error) {
      console.log('🔍 Erreur dans getPricingSummary:', error);
      return 'Prix non disponible';
    }
  }

  /**
   * Calcule la commission de l'application (40%)
   */
  static calculateCommission(finalPrice: number): {
    helperAmount: number;
    appCommission: number;
    commissionRate: number;
  } {
    // 🛡️ Validation
    if (typeof finalPrice !== 'number' || isNaN(finalPrice) || finalPrice < 0) {
      console.warn('⚠️ Prix invalide pour commission:', finalPrice);
      return {
        helperAmount: 0,
        appCommission: 0,
        commissionRate: 0.40
      };
    }

    const commissionRate = 0.40; // 40%
    const appCommission = finalPrice * commissionRate;
    const helperAmount = finalPrice - appCommission;
    
    return {
      helperAmount,
      appCommission,
      commissionRate
    };
  }

  /**
   * 🧪 Fonction de test pour vérifier le bon fonctionnement
   */
  static test(): void {
    console.log('🧪 Test PricingService...');
    
    const tests = [
      { start: '14:00', end: '17:00', expected: 3 },
      { start: '09:30', end: '11:00', expected: 1.5 }, // Devrait échouer (< 2h)
      { start: '10:00', end: '12:00', expected: 2 },
      { start: '10:00', end: '10:30', expected: 0.5 }, // Test durée minimum
    ];

    tests.forEach(({ start, end, expected }) => {
      try {
        const result = this.calculatePriceFromTimeRange(start, end);
        console.log(`✅ ${start}-${end}: ${result.hours}h (attendu: ${expected}h)`);
      } catch (error) {
        console.log(`🔍 ${start}-${end}:`, error);
      }
    });
  }
}