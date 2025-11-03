// app/(tabs)/services.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService } from '../../src/services/firebase/chatService';
import { Colors } from '@/constants/Colors';
import { DocumentData, Timestamp } from 'firebase/firestore';

type StatutServiceType = 'conversation' | 'service_confirme' | 'en_cours' | 'termine' | 'evaluation' | 'acompte_paye';

interface StatutInfo {
  label: string;
  couleur: string;
  icon: string;
}

const STATUTS: Record<StatutServiceType, StatutInfo> = {
  conversation: { label: 'En discussion', couleur: '#FF6B35', icon: '💬' },
  service_confirme: { label: 'Confirmé', couleur: '#3498db', icon: '🗓️' },
  acompte_paye: { label: 'Confirmé', couleur: '#3498db', icon: '🗓️' },
  en_cours: { label: 'En cours', couleur: '#27ae60', icon: '🔄' },
  termine: { label: 'Terminé', couleur: '#757575', icon: '✅' },
  evaluation: { label: 'À évaluer', couleur: '#f39c12', icon: '⭐' }
};

interface Conversation extends DocumentData {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: { displayName?: string } };
  lastMessage?: { texte: string; createdAt?: Timestamp };
  secteur: string;
  status: StatutServiceType;
  jour?: string;
  heureDebut?: string;
  heureFin?: string;
}

const ConversationCard = ({ item, onPress }: { item: Conversation; onPress: () => void }) => {
  const { user } = useAuth();
  if (!user) return null;

  const otherUserId = item.participants?.find(uid => uid !== user.uid);
  const otherUser = otherUserId ? item.participantDetails?.[otherUserId] : null;
  const statutInfo = STATUTS[item.status] || STATUTS.conversation;

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress}>
      <View style={styles.serviceHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(otherUser?.displayName || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.profileName}>{otherUser?.displayName || 'Interlocuteur'}</Text>
          <Text style={styles.serviceSecteur}>{item.secteur || '—'}</Text>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: statutInfo.couleur }]}>
          <Text style={styles.statutIcon}>{statutInfo.icon}</Text>
          <Text style={styles.statutText}>{statutInfo.label}</Text>
        </View>
      </View>
      <Text style={styles.dernierMessage} numberOfLines={1}>
        {item.lastMessage?.texte || 'Démarrez la conversation...'}
      </Text>
    </TouchableOpacity>
  );
};

const Section = ({
  title,
  data,
  onPressItem,
}: {
  title: string;
  data: Conversation[];
  onPressItem: (item: Conversation) => void;
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {data.map((item: Conversation) => (
      <ConversationCard key={item.id} item={item} onPress={() => onPressItem(item)} />
    ))}
  </View>
);

export default function MesServicesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsubscribe = chatService.listenToUserConversations(user.uid, (convs) => {
      // Tri côté client (on évite l’orderBy Firestore qui demande un index composite)
      const sortedConvs = (convs || []).sort((a: any, b: any) => {
        const timeA = a?.lastMessage?.createdAt?.toDate?.() ?? 0;
        const timeB = b?.lastMessage?.createdAt?.toDate?.() ?? 0;
        return (timeB as number) - (timeA as number);
      });
      setConversations(sortedConvs as Conversation[]);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [user]);

  const sections = useMemo(() => {
    return {
      '💬 En discussion': conversations.filter((c) => c.status === 'conversation'),
      '🗓️ Services à venir': conversations.filter((c) => ['service_confirme', 'acompte_paye', 'en_cours'].includes(c.status)),
      '✅ Services terminés': conversations.filter((c) => c.status === 'termine' || c.status === 'evaluation'),
    };
  }, [conversations]);

  const ouvrirConversation = (conv: Conversation) => {
    if (!user) return;
    const otherUserId = conv.participants?.find((uid) => uid !== user.uid) || '';
    const otherUserName = otherUserId ? conv.participantDetails?.[otherUserId]?.displayName || 'Interlocuteur' : 'Interlocuteur';
    router.push({
      pathname: '/conversation',
      params: {
        profileId: otherUserId,
        profileName: otherUserName,
        secteur: conv.secteur || '',
        jour: conv.jour || '',
        heureDebut: conv.heureDebut || '',
        heureFin: conv.heureFin || '',
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={Colors.light.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Mes Services</Text>
        <Text style={styles.headerSubtitle}>Suivez vos discussions et services</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>📭 Aucun service</Text>
          <Text style={styles.emptyText}>
            Lorsque vous contacterez un aidant, vos services apparaîtront ici.
          </Text>
          <TouchableOpacity style={styles.nouvelleRechercheButton} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.nouvelleRechercheText}>🔍 Trouver un aidant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          {Object.entries(sections).map(
            ([title, data]) => (data as Conversation[]).length > 0 && (
              <Section key={title} title={title} data={data as Conversation[]} onPressItem={ouvrirConversation} />
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#ffffff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C' },
  headerSubtitle: { fontSize: 14, color: '#687076', marginTop: 5 },
  sectionContainer: { marginTop: 20, marginHorizontal: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  serviceCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: { color: Colors.light.primary, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  serviceInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  serviceSecteur: { fontSize: 14, color: Colors.light.primary, fontWeight: '500' },
  statutBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statutIcon: { fontSize: 12, marginRight: 4 },
  statutText: { fontSize: 11, color: '#ffffff', fontWeight: '500' },
  dernierMessage: { fontSize: 14, color: '#6c757d', fontStyle: 'italic' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c757d', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  nouvelleRechercheButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  nouvelleRechercheText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
});
