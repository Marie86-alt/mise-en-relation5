// src/services/firebase/avisService.ts
// Lecture des avis. L'écriture (dépôt d'un avis, recalcul des notes) passe par le backend :
// voir src/services/reviewsApi.ts.
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export interface Avis {
  id?: string;
  aidantId: string;
  clientId: string;
  conversationId: string;
  rating: number; // 1-5 étoiles
  comment: string;
  serviceDate?: string | null;
  secteur?: string | null;
  dureeService?: number | null;
  montantService?: number | null;
  createdAt: any;
  clientName?: string;
  isVerified?: boolean;
}

export interface AvisStats {
  totalAvis: number;
  moyenneRating: number;
  repartition: { [key: number]: number };
}

const createdAtMillis = (a: Avis) => (a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime()) || 0;

export const avisService = {
  /** 📖 Récupère les avis d'un aidant (tri côté client, pas d'index requis) */
  async getAvisAidant(aidantId: string, limitCount: number = 10): Promise<Avis[]> {
    try {
      const avisSnap = await getDocs(
        query(collection(db, 'avis'), where('aidantId', '==', aidantId), where('isVerified', '==', true))
      );

      return avisSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Avis) }))
        .sort((a, b) => createdAtMillis(b) - createdAtMillis(a))
        .slice(0, limitCount);
    } catch (error) {
      if (__DEV__) console.warn('avisService.getAvisAidant', error);
      return [];
    }
  },

  /** 📊 Statistiques calculées localement à partir des avis (affichage détaillé) */
  async getAvisStats(aidantId: string): Promise<AvisStats> {
    const empty: AvisStats = { totalAvis: 0, moyenneRating: 0, repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    try {
      const avisSnap = await getDocs(
        query(collection(db, 'avis'), where('aidantId', '==', aidantId), where('isVerified', '==', true))
      );
      if (avisSnap.empty) return empty;

      const stats: AvisStats = { ...empty, repartition: { ...empty.repartition }, totalAvis: avisSnap.docs.length };
      let somme = 0;
      avisSnap.docs.forEach((d) => {
        const rating = Number((d.data() as Avis).rating);
        if (rating >= 1 && rating <= 5) {
          somme += rating;
          stats.repartition[rating] = (stats.repartition[rating] || 0) + 1;
        }
      });
      stats.moyenneRating = Math.round((somme / stats.totalAvis) * 10) / 10;
      return stats;
    } catch (error) {
      if (__DEV__) console.warn('avisService.getAvisStats', error);
      return empty;
    }
  },
};
