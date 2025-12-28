// components/admin/AdminHeaderTabs.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
//import { Colors } from '@/constants/Colors';

function TabBtn({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AdminHeaderTabs({
  tab,
  setTab,
  pendingCount,
  usersCount,
  conversationsCount,
  styles,
}: {
  tab: 'validations' | 'users' | 'conversations' | 'stats';
  setTab: (t: 'validations' | 'users' | 'conversations' | 'stats') => void;
  pendingCount: number;
  usersCount: number;
  conversationsCount: number;
  styles: any;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Panel Administrateur</Text>

      <View style={styles.tabs}>
        <TabBtn
          active={tab === 'validations'}
          onPress={() => setTab('validations')}
          label={`Validations${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
          styles={styles}
        />
        <TabBtn
          active={tab === 'users'}
          onPress={() => setTab('users')}
          label={`Utilisateurs (${usersCount})`}
          styles={styles}
        />
        <TabBtn
          active={tab === 'conversations'}
          onPress={() => setTab('conversations')}
          label={`Conversations (${conversationsCount})`}
          styles={styles}
        />
        <TabBtn active={tab === 'stats'} onPress={() => setTab('stats')} label="📊 Stats" styles={styles} />
      </View>
    </View>
  );
}
