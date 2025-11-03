// src/services/firebase/avisService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase.config';

export interface Avis {
  id?: string;
  aidantId: string;
  clientId: string;
  conversationId: string;
  rating: number; // 1-5 étoiles
  comment: string;
  serviceDate: string;
  secteur: string;
  dureeService: number;
  montantService: number;
  createdAt: any;
  clientName?: string;
  isVerified?: boolean;
}

export interface AvisStats {
  totalAvis: number;
  moyenneRating: number;
  repartition: { [key: number]: number };
}

export const avisService = {
  /** 💾 Sauvegarde un nouvel avis */
  async createAvis(avisData: Omit<Avis, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('💾 Sauvegarde nouvel avis:', avisData);

      const avisComplet: Omit<Avis, 'id'> = {
        ...avisData,
        createdAt: serverTimestamp(),
        isVerified: true,
      };

      const docRef = await addDoc(collection(db, 'avis'), avisComplet);

      await this.updateAidantStats(avisData.aidantId, avisData.rating);

      console.log('✅ Avis sauvegardé avec ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur sauvegarde avis:', error);
      throw error;
    }
  },

  /** 📊 Met à jour les statistiques de l'aidant */
  async updateAidantStats(aidantId: string, newRating: number): Promise<void> {
    try {
      const aidantStatsRef = doc(db, 'aidant_stats', aidantId);

      // Recalcule à partir des avis existants
      const avisQueryRef = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId),
        where('isVerified', '==', true)
      );
      const avisSnap = await getDocs(avisQueryRef);

      const totalAvis = avisSnap.docs.length + 1; // +1 pour le nouvel avis
      let sommeRatings = newRating;

      avisSnap.docs.forEach((d) => {
        const a = d.data() as Avis;
        sommeRatings += a.rating;
      });

      const moyenneRating = Math.round((sommeRatings / totalAvis) * 10) / 10;

      await setDoc(
        aidantStatsRef,
        {
          averageRating: moyenneRating,
          totalReviews: totalAvis,
          lastReviewAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log('📊 Stats aidant mises à jour:', {
        aidantId,
        moyenneRating,
        totalAvis,
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour stats aidant:', error);
      // on n’interrompt pas le flux côté client
    }
  },

  /** 📖 Récupère les avis d'un aidant (tri côté client, pas d’index requis) */
  async getAvisAidant(aidantId: string, limitCount: number = 10): Promise<Avis[]> {
    try {
      const avisQueryRef = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId),
        where('isVerified', '==', true)
      );

      const avisSnap = await getDocs(avisQueryRef);

      const avisList: Avis[] = avisSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Avis),
      }));

      // tri desc par createdAt côté client
      avisList.sort((a, b) => {
        const ta =
          (a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime()) || 0;
        const tb =
          (b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime()) || 0;
        return tb - ta;
      });

      // applique le limit côté client
      const limited = avisList.slice(0, limitCount);

      console.log(`📖 ${limited.length}/${avisList.length} avis récupérés pour aidant ${aidantId}`);
      return limited;
    } catch (error) {
      console.error('❌ Erreur récupération avis:', error);
      return [];
    }
  },

  /** 📊 Calcule les stats (sans orderBy) */
  async getAvisStats(aidantId: string): Promise<AvisStats> {
    try {
      const avisQueryRef = query(
        collection(db, 'avis'),
        where('aidantId', '==', aidantId),
        where('isVerified', '==', true)
      );

      const avisSnap = await getDocs(avisQueryRef);

      const stats: AvisStats = {
        totalAvis: avisSnap.docs.length,
        moyenneRating: 0,
        repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

      if (stats.totalAvis === 0) return stats;

      let sommeRatings = 0;
      avisSnap.docs.forEach((d) => {
        const a = d.data() as Avis;
        sommeRatings += a.rating;
        stats.repartition[a.rating] = (stats.repartition[a.rating] || 0) + 1;
      });

      stats.moyenneRating = Math.round((sommeRatings / stats.totalAvis) * 10) / 10;

      return stats;
    } catch (error) {
      console.error('❌ Erreur calcul stats avis:', error);
      return {
        totalAvis: 0,
        moyenneRating: 0,
        repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }
  },

  /** 🔍 Recherche par mots-clés (tri côté client) */
  async searchAvisByKeywords(keywords: string[]): Promise<Avis[]> {
    try {
      // on récupère un lot et on filtre côté client
      const avisQueryRef = query(
        collection(db, 'avis'),
        where('isVerified', '==', true)
      );

      const avisSnap = await getDocs(avisQueryRef);

      const avisList: Avis[] = avisSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Avis) }))
        .filter((a) => {
          const txt = (a.comment || '').toLowerCase();
          return keywords.some((k) => txt.includes(k.toLowerCase()));
        });

      avisList.sort((a, b) => {
        const ta =
          (a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime()) || 0;
        const tb =
          (b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime()) || 0;
        return tb - ta;
      });

      console.log(`🔍 ${avisList.length} avis trouvés pour`, keywords);
      return avisList;
    } catch (error) {
      console.error('❌ Erreur recherche avis:', error);
      return [];
    }
  },
};
