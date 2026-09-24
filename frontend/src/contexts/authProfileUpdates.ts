export interface SanitizableUserProfile {
  displayName?: string | null;
  experience?: number | null;
  tarifHeure?: number | null;
  description?: string | null;
  isAidant?: boolean;
  secteur?: string | null;
  genre?: string | null;
  [key: string]: unknown;
}

type EditableUserField = keyof Pick<
  SanitizableUserProfile,
  | 'displayName'
  | 'experience'
  | 'tarifHeure'
  | 'description'
  | 'isAidant'
  | 'secteur'
  | 'genre'
>;

const EDITABLE_USER_FIELDS: EditableUserField[] = [
  'displayName',
  'experience',
  'tarifHeure',
  'description',
  'isAidant',
  'secteur',
  'genre',
];

export const sanitizeUserProfileUpdates = <T extends SanitizableUserProfile>(
  updates: T
): Partial<T> => {
  const safeUpdates: Partial<T> = {};

  EDITABLE_USER_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      safeUpdates[field as keyof T] = updates[field as keyof T];
    }
  });

  return safeUpdates;
};
