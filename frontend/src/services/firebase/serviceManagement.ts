// Fichier: src/services/firebase/serviceManagement.ts

import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export const serviceManagement = {
  /**
   * Crée ou met à jour un document dans la collection 'services'
   * @param serviceData Données du service à enregistrer
   */
  createOrUpdateServiceRecord: async (serviceData: {
    serviceId: string; // Utiliser conversationId comme ID pour lier les deux
    aidantId: string;
    clientId: string;
    secteur: string;
    montant: number;
    duree: number;
    date: string;
  }) => {
    const serviceRef = doc(db, 'services', serviceData.serviceId);
    try {
      await setDoc(serviceRef, {
        ...serviceData,
        status: 'acompte_paye', // Statut initial après le versement de l'acompte
        createdAt: serverTimestamp(),
      }, { merge: true }); // 'merge: true' crée le doc s'il n'existe pas, ou le met à jour sinon
      console.log(`✅ Document de service créé/mis à jour : ${serviceData.serviceId}`);
    } catch (error) {
      console.error("❌ Erreur lors de la création du document de service:", error);
    }
  },

  /**
   * Crée un document dans la collection 'transactions'
   * @param transactionData Données de la transaction à enregistrer
   */
  createTransactionRecord: async (transactionData: {
    serviceId: string;
    clientId: string;
    aidantId: string;
    montant: number;
    commission: number;
    type: 'acompte' | 'final';
  }) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
      console.log(`✅ Transaction de type "${transactionData.type}" enregistrée pour le service ${transactionData.serviceId}`);
    } catch (error) {
      console.error("❌ Erreur lors de la création de la transaction:", error);
    }
  },

  /**
   * Met à jour le statut d'un service et ajoute la date de complétion
   * @param serviceId ID du service à mettre à jour
   */
  completeServiceRecord: async (serviceId: string) => {
    const serviceRef = doc(db, 'services', serviceId);
    try {
      await updateDoc(serviceRef, {
        status: 'termine',
        completedAt: serverTimestamp()
      });
      console.log(`✅ Service ${serviceId} marqué comme terminé.`);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour du service:", error);
    }
  }
};
