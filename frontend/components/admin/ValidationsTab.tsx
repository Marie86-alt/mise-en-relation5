// components/admin/ValidationsTab.tsx

import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
//import { Colors } from '@/constants/Colors';
import type { UserRow } from './AdminTypes';

export function ValidationsTab({
  pending,
  onVerify,
  styles,
}: {
  pending: UserRow[];
  onVerify: (uid: string) => void;
  styles: any;
}) {
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={styles.sectionTitle}>Profils à vérifier ({pending.length})</Text>

      <FlatList
        data={pending}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Aucun profil en attente 👌</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName || 'Sans nom'}</Text>
              <Text style={styles.email}>{item.email || ''}</Text>
              <Text style={styles.meta}>
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
