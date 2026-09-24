export interface FilterableProfile {
  secteur?: string | null;
  secteurs?: string[];
  genre?: string | null;
}

// Minuscules, espaces normalisés et accents retirés : « Indifférent » → « indifferent »
export const normalizeProfileString = (str?: string | null) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

export const profileMatchesSecteur = (
  data: Pick<FilterableProfile, 'secteur' | 'secteurs'>,
  secteur?: string | null
) => {
  if (!secteur) return true;

  const expected = normalizeProfileString(secteur);
  const aidantSecteurs = [data.secteur, ...(data.secteurs || [])].filter(Boolean);
  return aidantSecteurs.some((value) => normalizeProfileString(String(value)) === expected);
};

export const profileMatchesPreference = (
  data: Pick<FilterableProfile, 'genre'>,
  preferenceAidant?: string | null
) => {
  const normalizedPreference = normalizeProfileString(preferenceAidant);
  if (!normalizedPreference || normalizedPreference === 'indifferent') return true;
  if (!data.genre) return true;
  return normalizeProfileString(data.genre) === normalizedPreference;
};
