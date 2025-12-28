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
}: {
  users: UserRow[];
  totalUsersCount: number;
  filter: string;
  setFilter: (v: string) => void;
  onToggleSuspend: (u: UserRow) => void;
  onDeleteUser: (u: UserRow) => void;
  styles: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={styles.sectionTitle}>Utilisateurs ({totalUsersCount})</Text>

      <TextInput
        placeholder="Filtrer par email ou nom…"
        value={filter}
        onChangeText={setFilter}
        style={styles.search}
        autoCapitalize="none"
      />

      <FlatList
        data={users}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Aucun utilisateur</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName || 'Sans nom'}</Text>
              <Text style={styles.email}>{item.email || ''}</Text>
              <Text style={styles.meta}>
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
