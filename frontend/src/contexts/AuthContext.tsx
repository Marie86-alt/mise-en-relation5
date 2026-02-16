// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/firebase.config';
import {Alert} from 'react-native';

// ---------- TYPES ----------
export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;

  role?: 'user' | 'admin';
  isAdmin?: boolean;

  // Profil aidant (facultatif)
  experience?: number | null;
  tarifHeure?: number | null;
  description?: string | null;
  isAidant?: boolean;
  secteur?: string | null;
  genre?: string | null;

  // État du compte
  isVerified?: boolean;
  isSuspended?: boolean;
  isDeleted?: boolean;

  createdAt?: Timestamp | Date | null;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;

  signUp: (
    email: string,
    password: string,
    additionalData?: Partial<User>
  ) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ---------- CONTEXTE ----------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return ctx;
};

// ---------- PROVIDER ----------
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Abonnement à la session + ensureUserDoc ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      try {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        

        const userRef = doc(db, 'users', firebaseUser.uid);
        let snap = await getDoc(userRef);

        // ⚙️ ensureUserDoc : si le doc Firestore n'existe pas → on le crée
        if (!snap.exists()) {
          await setDoc(
            userRef,
            {
              email: firebaseUser.email ?? null,
              displayName: firebaseUser.displayName ?? null,
              role: 'user',
              isAdmin: false,
              isVerified: false,
              isSuspended: false,
              isDeleted: false,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          snap = await getDoc(userRef); // relire les données
        }

        const data = (snap.data() || {}) as Partial<User>;

        const finalUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName ?? data.displayName ?? null,

          role: (data.role as User['role']) ?? 'user',
          isAdmin: data.isAdmin === true || data.role === 'admin',

          // état du compte
          isVerified: data.isVerified ?? false,
          isSuspended: data.isSuspended ?? false,
          isDeleted: data.isDeleted ?? false,

          createdAt: (data.createdAt as Timestamp) ?? null,

          // champs aidant
          experience: data.experience ?? null,
          tarifHeure: data.tarifHeure ?? null,
          description: data.description ?? null,
          isAidant: data.isAidant ?? false,
          secteur: data.secteur ?? null,
          genre: data.genre ?? null,
        };

        // Si le compte est suspendu ou supprimé → on déconnecte
        if (finalUser.isDeleted) {
  setUser(null);
  setError('Votre compte a été supprimé par un administrateur.');
  
  // ✅ ALERT VISIBLE pour l'utilisateur
  Alert.alert(
    '🚫 Compte supprimé',
    'Votre compte a été désactivé par un administrateur.\n\nVous ne pouvez plus accéder à l\'application.\n\nContactez le support si vous pensez qu\'il s\'agit d\'une erreur.',
    [
      { 
        text: 'Compris',
        onPress: () => {},
        style: 'default'
      },
    ],
    { cancelable: false }
  );
  
  await fbSignOut(auth);
  setLoading(false);
  return;
}
        if (finalUser.isSuspended) {
          setUser(null);
          setError('Votre compte est suspendu. Contactez le support.');
          await fbSignOut(auth);
          setLoading(false);
          return;
        }

        setUser(finalUser);
      } catch (e: any) {
        setError(e?.message ?? 'Erreur de session');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
  if (!user?.uid) return;

  const ref = doc(db, 'users', user.uid);
  const unsub = onSnapshot(
    ref, 
    (snap) => {
      const data = snap.data() as Partial<User> | undefined;
      if (!data) return;

      setUser((prev) =>
        prev
          ? {
              ...prev,
              role: (data.role as User['role']) ?? prev.role,
              isAdmin: data.isAdmin === true || data.role === 'admin',
              isSuspended: typeof data.isSuspended === 'boolean' ? data.isSuspended : prev.isSuspended,
              isDeleted: typeof data.isDeleted === 'boolean' ? data.isDeleted : prev.isDeleted,
            }
          : prev
      );
    },
    (error) => {
      // Gestion silencieuse des erreurs de déconnexion Firebase
      if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
        console.warn('Firebase listener error:', error);
      }
    }
  );

  return unsub;
}, [user?.uid]); // ✅ dépend de l’uid actuel

  // ---------- Actions (stables via useCallback) ----------

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      additionalData: Partial<User> = {}
    ): Promise<FirebaseUser> => {
      setError(null);
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = cred.user;

        // MAJ displayName côté Auth si fourni
        if (additionalData.displayName) {
          await updateProfile(fbUser, { displayName: additionalData.displayName || '' });
        }

        // Créer / merger le document Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        await setDoc(
          userRef,
          {
            email: fbUser.email ?? null,
            displayName: additionalData.displayName ?? fbUser.displayName ?? null,
            role: 'user',
            isVerified: false,
            isSuspended: false,
            isDeleted: false,
            createdAt: serverTimestamp(),

            // champs aidant si fournis
            experience: additionalData.experience ?? null,
            tarifHeure: additionalData.tarifHeure ?? null,
            description: additionalData.description ?? null,
            isAidant: additionalData.isAidant ?? false,
            secteur: additionalData.secteur ?? null,
            genre: additionalData.genre ?? null,
          },
          { merge: true }
        );

        return fbUser;
      } catch (e: any) {
        setError(e?.message ?? 'Erreur inscription');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<FirebaseUser> => {
      setError(null);
      setLoading(true);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      } catch (e: any) {
        setError(e?.message ?? 'Erreur connexion');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(
    async (): Promise<void> => {
      setError(null);
      setLoading(true);
      try {
        await fbSignOut(auth);
        setUser(null);
        // Navigation gérée par RootLayoutNav dans _layout.tsx
      } catch (e: any) {
        setError(e?.message ?? 'Erreur déconnexion');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<void> => {
      if (!user) throw new Error('Utilisateur non connecté');
      setError(null);
      setLoading(true);
      try {
        // Synchroniser displayName côté Auth si on le met à jour
        if (typeof updates.displayName !== 'undefined' && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: updates.displayName || '' });
        }

        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
      } catch (e: any) {
        setError(e?.message ?? 'Erreur mise à jour profil');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const deleteAccount = useCallback(
    async (): Promise<void> => {
      if (!user || !auth.currentUser) {
        throw new Error('Utilisateur non connecté');
      }
      setError(null);
      setLoading(true);
      try {
        // 1. Supprimer le document Firestore
        await deleteDoc(doc(db, 'users', user.uid));

        // 2. Supprimer le compte Firebase Auth
        await deleteUser(auth.currentUser);

        // 3. Réinitialiser l'état local
        setUser(null);
      } catch (e: any) {
        // Si l'erreur est "requires-recent-login", l'utilisateur doit se reconnecter
        if (e?.code === 'auth/requires-recent-login') {
          setError('Pour des raisons de sécurité, veuillez vous reconnecter avant de supprimer votre compte.');
        } else {
          setError(e?.message ?? 'Erreur lors de la suppression du compte');
        }
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const clearError = useCallback(() => setError(null), []);

  const isAdmin = !! user?.isAdmin || user?.role === 'admin';

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAdmin,
      loading,
      error,
      signUp,
      signIn,
      logout,
      updateUserProfile,
      deleteAccount,
      clearError,
    }),
    [user, isAdmin, loading, error, signUp, signIn, logout, updateUserProfile, deleteAccount, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
