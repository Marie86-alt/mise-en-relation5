// Fichier: utils/dateValidation.ts

export const validateDate = (dateString: string): { isValid: boolean; error?: string } => {
  // Retire les espaces
  const cleanDate = dateString.trim();
  
  // Vérifie le format JJ/MM/AAAA
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = cleanDate.match(dateRegex);
  
  if (!match) {
    return {
      isValid: false,
      error: "Format invalide. Utilisez JJ/MM/AAAA (ex: 15/08/2025)"
    };
  }
  
  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  
  // Vérifie les valeurs
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: "Mois invalide (01-12)"
    };
  }
  
  if (day < 1 || day > 31) {
    return {
      isValid: false,
      error: "Jour invalide (01-31)"
    };
  }
  
  // Vérifie que l'année est dans une plage raisonnable
  const currentYear = new Date().getFullYear();
  if (year < currentYear || year > currentYear + 2) {
    return {
      isValid: false,
      error: `Année invalide (${currentYear}-${currentYear + 2})`
    };
  }
  
  // Vérifie que la date existe réellement
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return {
      isValid: false,
      error: "Cette date n'existe pas"
    };
  }
  
  // Vérifie que la date n'est pas dans le passé
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return {
      isValid: false,
      error: "La date ne peut pas être dans le passé"
    };
  }
  
  return { isValid: true };
};

export const validateTime = (timeString: string): { isValid: boolean; error?: string } => {
  // Accepte les formats : "10h00", "10:00", "10h", "10"
  const timeRegex = /^(\d{1,2})[h:]?(\d{0,2})$/;
  const match = timeString.trim().match(timeRegex);
  
  if (!match) {
    return {
      isValid: false,
      error: "Format invalide. Utilisez 10h00"
    };
  }
  
  const [, hourStr, minuteStr = "00"] = match;
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  if (hour < 0 || hour > 23) {
    return {
      isValid: false,
      error: "Heure invalide (00-23)"
    };
  }
  
  if (minute < 0 || minute > 59) {
    return {
      isValid: false,
      error: "Minutes invalides (00-59)"
    };
  }
  
  return { isValid: true };
};

// Formate l'heure au format français "10h00"
export const formatTimeToFrench = (timeString: string): string => {
  const timeRegex = /^(\d{1,2})[h:]?(\d{0,2})$/;
  const match = timeString.trim().match(timeRegex);
  
  if (!match) return timeString;
  
  const [, hourStr, minuteStr = "00"] = match;
  const hour = hourStr.padStart(2, '0');
  const minute = minuteStr.padStart(2, '0');
  
  return `${hour}h${minute}`;
};

// Convertit l'heure en minutes pour comparaison
export const convertTimeToMinutes = (timeString: string): number => {
  const timeRegex = /^(\d{1,2})[h:](\d{2})$/;
  const match = timeString.match(timeRegex);
  
  if (!match) return 0;
  
  const [, hourStr, minuteStr] = match;
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  return hour * 60 + minute;
};