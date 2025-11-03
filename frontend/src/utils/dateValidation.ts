// src/utils/dateValidation.ts
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateDate(dateStr: string): ValidationResult {
  if (!dateStr) {
    return { isValid: false, error: 'Date requise' };
  }

  // Vérifie le format JJ/MM/AAAA
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) {
    return { isValid: false, error: 'Format invalide. Utilisez JJ/MM/AAAA' };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Vérifie les limites de base
  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Mois invalide (1-12)' };
  }

  if (day < 1 || day > 31) {
    return { isValid: false, error: 'Jour invalide (1-31)' };
  }

  // Crée une date et vérifie qu'elle est valide
  const date = new Date(year, month - 1, day);
  
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return { isValid: false, error: 'Date inexistante' };
  }

  // Vérifie que la date n'est pas dans le passé
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { isValid: false, error: 'La date ne peut pas être dans le passé' };
  }

  // Vérifie que la date n'est pas trop loin dans le futur (1 an max)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  if (date > maxDate) {
    return { isValid: false, error: 'Date trop éloignée (maximum 1 an)' };
  }

  return { isValid: true };
}

export function validateTime(timeStr: string): ValidationResult {
  if (!timeStr) {
    return { isValid: false, error: 'Heure requise' };
  }

  // Accepte plusieurs formats : 10, 10h, 10h00, 10:00
  const timeRegex = /^(\d{1,2})(?:[h:]?(\d{0,2}))?$/;
  const match = timeStr.match(timeRegex);
  
  if (!match) {
    return { isValid: false, error: 'Format invalide. Ex: 10h00 ou 10:30' };
  }

  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (hours < 0 || hours > 23) {
    return { isValid: false, error: 'Heure invalide (0-23)' };
  }

  if (minutes < 0 || minutes > 59) {
    return { isValid: false, error: 'Minutes invalides (0-59)' };
  }

  return { isValid: true };
}

export function formatTimeToFrench(timeStr: string): string {
  const timeRegex = /^(\d{1,2})(?:[h:]?(\d{0,2}))?$/;
  const match = timeStr.match(timeRegex);
  
  if (!match) return timeStr;
  
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  
  return `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;
}

export function convertTimeToMinutes(timeStr: string): number {
  const timeRegex = /^(\d{1,2})(?:[h:]?(\d{0,2}))?$/;
  const match = timeStr.match(timeRegex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  
  return hours * 60 + minutes;
}