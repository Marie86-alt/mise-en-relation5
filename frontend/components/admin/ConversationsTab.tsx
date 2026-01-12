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
  theme,
}: {
  conversations: ConversationRow[];
  totalConversationsCount: number;
  filter: string;
  setFilter: (v: string) => void;
  onOpenConversation: (c: ConversationRow) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: theme.background }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Modération des conversations ({totalConversationsCount})</Text>

      <TextInput
        placeholder="Filtrer par secteur ou nom…"
        placeholderTextColor={theme.textSecondary}
        value={filter}
        onChangeText={setFilter}
        style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
        autoCapitalize="none"
      />

      <FlatList
        data={conversations}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={[styles.muted, { color: theme.textSecondary }]}>Aucune conversation</Text>}
        renderItem={({ item }) => {
          const namesArray = Object.values(item.participantDetails ?? {});
          const participantNames = namesArray.map((p) => p?.displayName || 'Inconnu').join(' ↔ ');

          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => onOpenConversation(item)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{participantNames}</Text>
                <Text style={[styles.email, { color: theme.textSecondary }]}>
                  {item.secteur} • {item.status}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
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
