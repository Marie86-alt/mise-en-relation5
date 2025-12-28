// components/admin/ConversationsTab.tsx

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import type { ConversationRow } from './AdminTypes';

export function ConversationsTab({
  conversations,
  totalConversationsCount,
  filter,
  setFilter,
  onOpenConversation,
  styles,
}: {
  conversations: ConversationRow[];
  totalConversationsCount: number;
  filter: string;
  setFilter: (v: string) => void;
  onOpenConversation: (c: ConversationRow) => void;
  styles: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={styles.sectionTitle}>Modération des conversations ({totalConversationsCount})</Text>

      <TextInput
        placeholder="Filtrer par secteur ou nom…"
        value={filter}
        onChangeText={setFilter}
        style={styles.search}
        autoCapitalize="none"
      />

      <FlatList
        data={conversations}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Aucune conversation</Text>}
        renderItem={({ item }) => {
          const namesArray = Object.values(item.participantDetails ?? {});
          const participantNames = namesArray.map((p) => p?.displayName || 'Inconnu').join(' ↔ ');

          return (
            <TouchableOpacity style={styles.card} onPress={() => onOpenConversation(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{participantNames}</Text>
                <Text style={styles.email}>
                  {item.secteur} • {item.status}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.lastMessage?.texte || 'Pas de message'}
                </Text>
              </View>

              <View style={styles.primary}>
                <Text style={styles.btnTxt}>👁️ Voir</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
