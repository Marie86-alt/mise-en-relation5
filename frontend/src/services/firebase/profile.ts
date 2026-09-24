import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../../firebase.config';
import {
  profileMatchesPreference,
  profileMatchesSecteur,
  type FilterableProfile,
} from './profileFilters';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export interface ProfileSearchCriteria {
  cursor?: string | null;
  secteur?: string | null;
  preferenceAidant?: string | null;
  pageSize?: number;
}

export interface AidantProfile extends FilterableProfile {
  id: string;
  displayName?: string | null;
  nom?: string | null;
  email?: string | null;
  isAidant?: boolean;
  isVerified?: boolean;
  isSuspended?: boolean;
  isDeleted?: boolean;
  averageRating?: number;
  [key: string]: unknown;
}

export interface ProfileSearchPage {
  profiles: AidantProfile[];
  nextCursor: string | null;
}

export const buildProfileSearchConstraints = (
  searchCriteria: ProfileSearchCriteria = {}
): QueryConstraint[] => {
  const { cursor, secteur, pageSize = DEFAULT_PAGE_SIZE } = searchCriteria;
  const safePageSize = Math.min(Number(pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const constraints: QueryConstraint[] = [
    where('isAidant', '==', true),
    where('isVerified', '==', true),
    where('isSuspended', '==', false),
    where('isDeleted', '==', false),
  ];

  if (secteur) {
    constraints.push(where('secteur', '==', secteur));
  }

  constraints.push(orderBy(documentId()));

  if (cursor) {
    constraints.push(startAfter(String(cursor)));
  }

  constraints.push(limit(safePageSize));
  return constraints;
};

const toAidantProfile = (id: string, data: DocumentData): AidantProfile => ({
  id,
  ...(data as Omit<AidantProfile, 'id'>),
});

export const profilesService = {
  searchProfilesPage: async (
    searchCriteria: ProfileSearchCriteria = {}
  ): Promise<ProfileSearchPage> => {
    const snapshot = await getDocs(
      query(collection(db, 'users'), ...buildProfileSearchConstraints(searchCriteria))
    );

    const profiles = snapshot.docs
      .map((profileDoc) => toAidantProfile(profileDoc.id, profileDoc.data()))
      .filter((data) => profileMatchesSecteur(data, searchCriteria.secteur))
      .filter((data) => profileMatchesPreference(data, searchCriteria.preferenceAidant))
      .sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0));

    return {
      profiles,
      nextCursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : null,
    };
  },

  searchProfiles: async (
    searchCriteria: ProfileSearchCriteria = {}
  ): Promise<AidantProfile[]> => {
    const result = await profilesService.searchProfilesPage(searchCriteria);
    return result.profiles;
  },

  getProfile: async (userId: string): Promise<AidantProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? toAidantProfile(userDoc.id, userDoc.data()) : null;
    } catch (error) {
      if (__DEV__) console.error('Erreur getProfile:', error);
      return null;
    }
  },

  updateProfile: async (
    userId: string,
    updateData: Partial<AidantProfile>
  ): Promise<boolean> => {
    await updateDoc(doc(db, 'users', userId), updateData);
    return true;
  },
};
