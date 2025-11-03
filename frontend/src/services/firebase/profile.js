import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase.config.js';

export const profilesService = {

  /**
   * Recherche les utilisateurs qui ont un profil aidant activé.
   * Cible la collection 'users' et filtre selon les critères.
   */
  searchProfiles: async (searchCriteria) => {     
    try {
      const { secteur, preferenceAidant } = searchCriteria;

      console.log('🔍 Lancement de la recherche dans la collection "users":', searchCriteria);    

      // ✅ FONCTION DE NORMALISATION POUR SECTEURS
      const normalizeString = (str) => {
        if (!str) return '';
        return str.toLowerCase().trim().replace(/\s+/g, ' ');
      };

      const usersCollection = collection(db, 'users');

      // ✅ VERSION SIMPLIFIÉE : On essaie d'abord sans filtre pour tester les permissions        
      console.log('🧪 Test 1: Lecture de tous les utilisateurs...');

      try {
        const allUsersQuery = query(usersCollection, limit(10));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        console.log('✅ Test 1 réussi:', allUsersSnapshot.docs.length, 'utilisateurs lus');       

        // Afficher quelques utilisateurs pour debug
        allUsersSnapshot.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`👤 User ${i+1}:`, {        
            id: doc.id,
            email: data.email,
            isAidant: data.isAidant,
            isVerified: data.isVerified,
            secteur: data.secteur
          });
        });

      } catch (testError) {
        console.error('❌ Test 1 échoué - Pas de permission de lecture basique:', testError);     
        throw new Error('Permissions insuffisantes pour lire les utilisateurs. Vérifiez les règles Firestore.');
      }

      // ✅ Test 2: Filtrage par isAidant
      console.log('🧪 Test 2: Filtrage par isAidant = true...');

      try {
        const aidantsQuery = query(
          usersCollection,
          where('isAidant', '==', true),
          limit(10)
        );
        const aidantsSnapshot = await getDocs(aidantsQuery);
        console.log('✅ Test 2 réussi:', aidantsSnapshot.docs.length, 'aidants trouvés');

      } catch (testError) {
        console.error('❌ Test 2 échoué - Problème avec le filtre isAidant:', testError);
        // On continue sans le filtre Firestore, on filtrera côté client
      }

      // ✅ Recherche principale
      console.log('🎯 Recherche principale...');  

      // Pour l'instant, on fait simple : pas de filtre Firestore, tout côté client
      const finalQuery = query(usersCollection);  
      const snapshot = await getDocs(finalQuery); 

      console.log('📊 Documents récupérés:', snapshot.docs.length);

      const profiles = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // ✅ Filtres côté client

        // 1. Doit être un aidant
        if (!data.isAidant) {
          return; // Ignore les non-aidants       
        }

        // 2. Filtre par secteur - VERSION CORRIGÉE
        let secteurCompatible = true;
        if (secteur) {
          const critereNormalized = normalizeString(secteur);
          const aidantSecteurs = [
            data.secteur,
            ...(data.secteurs || [])
          ].filter(Boolean);
          
          secteurCompatible = aidantSecteurs.some(s => 
            normalizeString(s) === critereNormalized
          );
          
          // 🐛 DEBUG - Pour voir la comparaison
          console.log('🔍 Comparaison secteur:', {
            aidant: data.displayName || data.nom || 'Sans nom',
            critere: secteur,
            critereNormalized,
            aidantSecteur: data.secteur,
            aidantSecteurs,
            match: secteurCompatible
          });
        }

        // 3. Filtre par préférence de genre de l'aidant
        let preferencesCompatibles = true;        
        if (preferenceAidant && preferenceAidant !== 'Indifférent' && data.genre) {
          preferencesCompatibles = data.genre.toLowerCase() === preferenceAidant.toLowerCase();   
        }

        // 4. Les horaires (pour l'instant on accepte tout)
        const horaireCompatible = true;

        // ✅ VALIDATION FINALE
        if (secteurCompatible && horaireCompatible && preferencesCompatibles) {
          profiles.push({
            id: doc.id,
            ...data
          });
          console.log('✅ Profil ajouté:', data.displayName || data.nom, data.secteur);
        } else {
          console.log('❌ Profil rejeté:', data.displayName || data.nom, {
            secteurOK: secteurCompatible,
            horaireOK: horaireCompatible,
            preferenceOK: preferencesCompatibles  
          });
        }
      });

      console.log(`✅ ${profiles.length} profils aidants trouvés après filtrage.`);

      // Tri par note
      profiles.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

      return profiles;

    } catch (error) {
      console.error('❌ Erreur lors de la recherche de profils:', error);
      console.error('❌ Type d\'erreur:', error.constructor.name);
      console.error('❌ Code erreur:', error.code);
      console.error('❌ Message:', error.message);
      throw error;
    }
  },

  /**
   * Récupère un profil utilisateur unique depuis la collection 'users'.
   */
  getProfile: async (userId) => {
     try {
      console.log('🔄 Récupération du profil utilisateur depuis la collection USERS, ID:', userId);
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        console.log('✅ Utilisateur trouvé:', userData.displayName);
        return userData;
      } else {
        console.warn('⚠️ Utilisateur non trouvé  avec ID:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur getProfile:', error);
      return null;
    }
  },

  // Note : Les fonctions ci-dessous (updateProfile, etc.) sont maintenant gérées
  // par le AuthContext, mais on les garde ici au cas où vous auriez besoin
  // de logiques plus complexes qui ne sont pas liées à l'utilisateur connecté.

  /**
   * Met à jour des données pour un utilisateur spécifique dans la collection 'users'.
   */
  updateProfile: async (userId, updateData) => {
    try {
      console.log('🔄 Mise à jour de l\'utilisateur:', userId);
      const userRef = doc(db, 'users', userId); 
      await updateDoc(userRef, updateData);     
      console.log('✅ Utilisateur mis à jour'); 
      return true;
    } catch (error) {
      console.error('❌ Erreur updateProfile:', error);
      throw error;
    }
  },
};