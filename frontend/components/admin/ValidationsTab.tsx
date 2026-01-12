// components/admin/ValidationsTab.tsx

import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
//import { Colors } from '@/constants/Colors';
import type { UserRow } from './AdminTypes';

export function ValidationsTab({
  pending,
  onVerify,
  styles,
  theme,
}: {
  pending: UserRow[];
  onVerify: (uid: string) => void;
  styles: any;
  theme: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: theme.background }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Profils à vérifier ({pending.length})</Text>

      <FlatList
        data={pending}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={[styles.muted, { color: theme.textSecondary }]}>Aucun profil en attente 👌</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{item.displayName || 'Sans nom'}</Text>
              <Text style={[styles.email, { color: theme.textSecondary }]}>{item.email || ''}</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {(item.isAidant ? 'Aidant • ' : '') + (item.secteur || 'Secteur inconnu')}
                {item.tarifHeure ? ` • ${item.tarifHeure}€/h` : ''}
              </Text>
            </View>

            <TouchableOpacity style={styles.primary} onPress={() => onVerify(item.id)}>
              <Text style={styles.btnTxt}>✅ Valider</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
