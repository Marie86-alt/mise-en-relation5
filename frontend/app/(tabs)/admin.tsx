// frontend/app/(tabs)/admin.tsx

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';

import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase.config';

import { statisticsService } from '@/src/services/firebase/statisticsService';

// ✅ components admin
import { AdminHeaderTabs } from '@/components/admin/AdminHeaderTabs';
import { ValidationsTab } from '@/components/admin/ValidationsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { ConversationsTab } from '@/components/admin/ConversationsTab';
import { MessagesModal } from '@/components/admin/MessagesModal';
import { StatsTab } from '@/components/admin/StatsTab';

import type { UserRow, ConversationRow, MessageRow, StatsUI } from '@/components/admin/AdminTypes';
import { s } from '@/components/admin/adminStyles';

export default function AdminScreen() {
  const { isAdmin, loading, user: adminUser } = useAuth();
  const { theme } = useTheme();
  const [tab, setTab] = useState<'validations' | 'users' | 'conversations' | 'stats'>('validations');

  const [pending, setPending] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRow | null>(null);
  const [conversationMessages, setConversationMessages] = useState<MessageRow[]>([]);
  const [filter, setFilter] = useState('');
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  const [stats, setStats] = useState<StatsUI>({
    totalUsers: 0,
    servicesRealises: 0,
    conversationsActives: 0,
    evaluationMoyenne: 0,
    totalAvis: 0,
    chiffreAffaires: 0,
    commissionPerçue: 0,
    topSecteursParRevenus: [],
    evolutionMensuelle: [],
    lastUpdate: undefined,
  });

  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      Alert.alert('Accès refusé', 'Réservé aux administrateurs.');
    }
  }, [loading, isAdmin]);

  // ---- Abonnement : profils à valider ----
  useEffect(() => {
    if (!isAdmin) return;

    const qPending = query(collection(db, 'users'), where('isVerified', '==', false), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      qPending,
      (snap) => setPending(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (err) => console.error('listen pending', err)
    );

    return unsub;
  }, [isAdmin]);

  // ---- Abonnement : liste d'utilisateurs ----
  useEffect(() => {
    if (!isAdmin) return;

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      qUsers,
      (snap) => {
        const activeUsers = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as UserRow)
          .filter((u) => !u.isDeleted);

        setUsers(activeUsers);
        console.log(`📊 Utilisateurs actifs: ${activeUsers.length}`);
      },
      (err) => console.error('listen users', err)
    );

    return unsub;
  }, [isAdmin]);

  // ---- Abonnement : conversations ----
  useEffect(() => {
    if (!isAdmin) return;

    const qConversations = query(collection(db, 'conversations'), orderBy('lastMessage.createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      qConversations,
      (snap) => {
        setConversations(
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...(d.data() as any),
                messageCount: 0,
              }) as ConversationRow
          )
        );
      },
      (err) => console.error('listen conversations', err)
    );

    return () => unsub();
  }, [isAdmin]);

  // ---- Filtrages ----
  const filteredUsers = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter(
      (u) => (u.email || '').toLowerCase().includes(f) || (u.displayName || '').toLowerCase().includes(f)
    );
  }, [users, filter]);

  const filteredConversations = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return conversations;
    return conversations.filter(
      (c) =>
        (c.secteur || '').toLowerCase().includes(f) ||
        (Object.values(c.participantDetails ?? {}) as { displayName?: string | null }[]).some((p) =>
          (p.displayName || '').toLowerCase().includes(f)
        )
    );
  }, [conversations, filter]);

  // ---- Logs admin ----
  const logAdminAction = async (action: string, targetUid: string, details?: any) => {
    await addDoc(collection(db, 'admin_logs'), {
      adminUid: adminUser?.uid ?? null,
      action,
      targetUid,
      details: details ?? null,
      at: serverTimestamp(),
    });
  };

  // ---- Actions ----
  const verifyAidant = async (targetUid: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { isVerified: true });
      await logAdminAction('VERIFY_AIDANT', targetUid);
      Alert.alert('✅ Profil vérifié', 'Le profil a été validé avec succès.');
    } catch {
      Alert.alert('Erreur', 'Impossible de vérifier ce profil.');
    }
  };

  const toggleSuspend = async (u: UserRow) => {
    const next = !u.isSuspended;
    const action = next ? 'suspendre' : 'réactiver';

    Alert.alert(`Confirmer`, `Voulez-vous ${action} l'utilisateur ${u.displayName || u.email} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: next ? 'Suspendre' : 'Réactiver',
        style: next ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', u.id), { isSuspended: next });
            await logAdminAction(next ? 'SUSPEND_USER' : 'UNSUSPEND_USER', u.id);
            Alert.alert('✅ Action effectuée', `Utilisateur ${next ? 'suspendu' : 'réactivé'} avec succès.`);
          } catch {
            Alert.alert('Erreur', 'Action impossible.');
          }
        },
      },
    ]);
  };

  const deleteUser = async (u: UserRow) => {
    Alert.alert(
      '⚠️ Supprimer utilisateur',
      `Voulez-vous supprimer l'utilisateur ${u.displayName || u.email} ?\n\n• L'utilisateur sera désactivé\n• Il ne pourra plus se connecter\n• Ses données seront conservées`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'SUPPRIMER',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', u.id), {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                deletedBy: adminUser?.uid,
              });

              const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', u.id));
              const conversationsSnap = await getDocs(conversationsQuery);

              for (const convDoc of conversationsSnap.docs) {
                const messagesQuery = query(collection(db, 'conversations', convDoc.id, 'messages'));
                const messagesSnap = await getDocs(messagesQuery);

                for (const msgDoc of messagesSnap.docs) {
                  await deleteDoc(doc(db, 'conversations', convDoc.id, 'messages', msgDoc.id));
                }
                await deleteDoc(doc(db, 'conversations', convDoc.id));
              }

              await logAdminAction('DELETE_USER_SOFT', u.id, {
                email: u.email || 'Email non renseigné',
                displayName: u.displayName || 'Nom non renseigné',
              });

              Alert.alert('✅ Utilisateur supprimé', "L'utilisateur a été désactivé et ne peut plus se connecter.");
            } catch (error: any) {
              console.error('❌ Erreur complète:', error);
              Alert.alert('Erreur', `Impossible de supprimer cet utilisateur: ${error?.message ?? 'Erreur inconnue'}`);
            }
          },
        },
      ]
    );
  };

  const loadConversationMessages = async (conversation: ConversationRow) => {
    try {
      setSelectedConversation(conversation);

      const messagesQuery = query(collection(db, 'conversations', conversation.id, 'messages'), orderBy('createdAt', 'asc'));
      const messagesSnap = await getDocs(messagesQuery);

      const messages = messagesSnap.docs.map((d) => {
        const data = d.data() as any;
        const expediteurName = conversation.participantDetails?.[data.expediteurId]?.displayName || 'Utilisateur inconnu';

        return {
          id: d.id,
          ...data,
          conversationId: conversation.id,
          expediteurName,
        } as MessageRow;
      });

      setConversationMessages(messages);
      setShowMessagesModal(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les messages.');
    }
  };

  const deleteMessage = async (message: MessageRow) => {
    Alert.alert('Supprimer le message', 'Voulez-vous supprimer ce message de manière définitive ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'conversations', message.conversationId, 'messages', message.id));
            await logAdminAction('DELETE_MESSAGE', message.expediteurId, {
              messageId: message.id,
              texte: message.texte,
              conversationId: message.conversationId,
            });

            if (selectedConversation) loadConversationMessages(selectedConversation);
            Alert.alert('✅ Message supprimé');
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer ce message.');
          }
        },
      },
    ]);
  };

  // ---- Stats (mapping AdminStats -> StatsUI) ----
  const calculateStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStats(true);

    try {
      const data = await statisticsService.calculateStats();
      console.log('LOG STATS RAW', data);

      setStats({
        totalUsers: (data.totalAidants ?? 0) + (data.totalClients ?? 0),
        servicesRealises: data.servicesRealises ?? 0,
        conversationsActives: data.conversationsActives ?? 0,

        evaluationMoyenne: data.evaluationMoyenne ?? 0,
        totalAvis: data.totalAvis ?? 0,

        chiffreAffaires: data.chiffreAffaires ?? 0,
        commissionPerçue: data.commissionPerçue ?? 0,

        topSecteursParRevenus: data.topSecteursParRevenus ?? [],
        evolutionMensuelle: data.evolutionMensuelle ?? [],

        lastUpdate: data.lastUpdate,
      });
    } catch (error) {
      console.error('❌ Erreur stats réelles:', error);
      Alert.alert('Erreur', 'Impossible de charger les statistiques');

      // fallback basique depuis le state users/conversations
      const activeUsers = users.filter((u) => !u.isDeleted);

      setStats({
        totalUsers: activeUsers.length,
        servicesRealises: 0,
        conversationsActives: conversations.filter((c) => c.status !== 'termine').length,
        evaluationMoyenne: 0,
        totalAvis: 0,
        chiffreAffaires: 0,
        commissionPerçue: 0,
        topSecteursParRevenus: [],
        evolutionMensuelle: [],
        lastUpdate: new Date().toISOString(),
      });
    } finally {
      setLoadingStats(false);
    }
  }, [isAdmin, users, conversations]);

  useEffect(() => {
    if (tab === 'stats' && isAdmin) {
      calculateStats();
    }
  }, [tab, isAdmin, calculateStats]);

  // ---- UI gate ----
  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Accès réservé aux administrateurs.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <AdminHeaderTabs
        tab={tab}
        setTab={setTab}
        pendingCount={pending.length}
        usersCount={users.length}
        conversationsCount={conversations.length}
        styles={s}
        theme={theme}
      />

      {tab === 'validations' && <ValidationsTab pending={pending} onVerify={verifyAidant} styles={s} theme={theme} />}

      {tab === 'users' && (
        <UsersTab
          users={filteredUsers}
          totalUsersCount={users.length}
          filter={filter}
          setFilter={setFilter}
          onToggleSuspend={toggleSuspend}
          onDeleteUser={deleteUser}
          styles={s}
          theme={theme}
        />
      )}

      {tab === 'conversations' && (
        <ConversationsTab
          conversations={filteredConversations}
          totalConversationsCount={conversations.length}
          filter={filter}
          setFilter={setFilter}
          onOpenConversation={loadConversationMessages}
          styles={s}
          theme={theme}
        />
      )}

      {tab === 'stats' && <StatsTab stats={stats} loadingStats={loadingStats} onRefresh={calculateStats} styles={s} />}

      <MessagesModal
        visible={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        messages={conversationMessages}
        onDeleteMessage={deleteMessage}
        styles={s}
      />
    </SafeAreaView>
  );
}
