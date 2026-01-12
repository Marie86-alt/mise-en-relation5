// components/admin/UsersTab.tsx

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import type { UserRow } from './AdminTypes';

export function UsersTab({
  users,
  totalUsersCount,
  filter,
  setFilter,
  onToggleSuspend,
  onDeleteUser,
  styles,
  theme,
}: {
  users: UserRow[];
  totalUsersCount: number;
  filter: string;
  setFilter: (v: string) => void;
  onToggleSuspend: (u: UserRow) => void;
  onDeleteUser: (u: UserRow) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: theme.background }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Utilisateurs ({totalUsersCount})</Text>

      <TextInput
        placeholder="Filtrer par email ou nom…"
        placeholderTextColor={theme.textSecondary}
        value={filter}
        onChangeText={setFilter}
        style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
        autoCapitalize="none"
      />

      <FlatList
        data={users}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={[styles.muted, { color: theme.textSecondary }]}>Aucun utilisateur</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{item.displayName || 'Sans nom'}</Text>
              <Text style={[styles.email, { color: theme.textSecondary }]}>{item.email || ''}</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {(item.isAidant ? 'Aidant • ' : 'Client • ') + (item.secteur || '—')}
                {'  '}|  {item.isVerified ? 'Vérifié ✅' : 'Non vérifié'}
                {item.isSuspended ? '  |  ⚠️ SUSPENDU' : ''}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={item.isSuspended ? styles.success : styles.warning}
                onPress={() => onToggleSuspend(item)}
              >
                <Text style={styles.btnTxt}>{item.isSuspended ? '🔓' : '🔒'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.danger} onPress={() => onDeleteUser(item)}>
                <Text style={styles.btnTxt}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
