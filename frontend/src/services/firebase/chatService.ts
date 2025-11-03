// src/services/firebase/chatService.ts
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, where, updateDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../../firebase.config';

// --- TYPES (inchangés) ---
export type StatutServiceType =
  | 'conversation'
  | 'service_confirme'
  | 'acompte_en_cours'
  | 'acompte_paye'
  | 'en_cours'
  | 'termine'
  | 'evaluation';

interface MessageWrite {
  texte: string;
  expediteurId: string;
}

export interface Message {
  id: string;
  texte: string;
  expediteurId: string;
  timestamp: any;
}

type MessagesCallback = (messages: Message[]) => void;
type ConversationsCallback = (conversations: DocumentData[]) => void;
type ConversationCallback = (conversation: DocumentData | null) => void;

const getConversationId = (uid1: string, uid2: string): string =>
  uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

export const chatService = {
  getConversationId,

ensureConversationExists: async (
  conversationId: string,
  participants: string[],
  participantDetails: { [uid: string]: { displayName?: string | null } }
): Promise<void> => {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    // ❌ pas de getDoc() ici (read interdit si le doc n’existe pas encore)
    await setDoc(
      convRef,
      {
        participants,
        participantDetails,
        status: 'conversation' as StatutServiceType,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('❌ ensureConversationExists setDoc failed:', error);
    throw error;
  }
},

  sendMessage: async (
    conversationId: string,
    messageData: MessageWrite
  ): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    const messagesCollection = collection(convRef, 'messages');
    await addDoc(messagesCollection, {
      texte: messageData.texte,
      expediteurId: messageData.expediteurId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(convRef, {
      lastMessage: {
        texte: messageData.texte,
        createdAt: serverTimestamp(),
      },
    });
  },

  updateConversationStatus: async (
    conversationId: string,
    status: StatutServiceType
  ): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { status });
  },

  updateConversationMetadata: async (
    conversationId: string,
    metadata: { [key: string]: any; }
  ): Promise<void> => {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { ...metadata, updatedAt: serverTimestamp() });
  },

  listenToMessages: (conversationId: string, callback: MessagesCallback) => {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
      callback(messages);
    });
  },

  listenToConversation: (conversationId: string, callback: ConversationCallback) => {
    const convRef = doc(db, 'conversations', conversationId);
    return onSnapshot(convRef, (doc) => {
      callback(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    });
  },

  // **CORRECTION ICI** : La clause `orderBy` a été retirée.
  listenToUserConversations: (userId: string, callback: ConversationsCallback) => {
   const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(conversations);
    },
    (err) => {
      console.error('onSnapshot(conversations) error:', err);
      callback([]); // on évite de crasher l’écran
    }
  );

  return unsubscribe;
},
};
