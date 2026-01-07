// components/admin/AdminHeaderTabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function TabBtn({ 
                  label, 
    active, 
    onPress, 
    styles,
    badgeCount,
    badgeColor = 'red'
}: { 
                  label: string; 
                  active: boolean; 
                  onPress: () => void; 
                  styles: any;
    badgeCount?: number;
    badgeColor?: 'red' | 'green' | 'orange';
}) {
    const badgeColorMap = {
          red: styles.tabBadgeRed,
          green: styles.tabBadgeGreen,
          orange: styles.tabBadgeOrange,
    };

  return (
        <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <View style={[styles.tabBadge, badgeColorMap[badgeColor]]}>
                                  <Text style={styles.tabBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                  )}
                </View>
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
                              label="Validations" 
                              styles={styles}
                                        badgeCount={pendingCount}
                                        badgeColor={pendingCount > 5 ? 'red' : 'orange'}
                                      />
                            <TabBtn 
                                        active={tab === 'users'} 
                              onPress={() => setTab('users')} 
                              label="Utilisateurs" 
                              styles={styles}
                                        badgeCount={usersCount}
                                        badgeColor="green"
                                      />
                            <TabBtn 
                                        active={tab === 'conversations'} 
                              onPress={() => setTab('conversations')} 
                              label="Conversations" 
                              styles={styles}
                                        badgeCount={conversationsCount}
                                        badgeColor="orange"
                                      />
                            <TabBtn 
                                        active={tab === 'stats'} 
                              onPress={() => setTab('stats')} 
                              label="📊 Stats" 
                              styles={styles}
                                      />
                  </View>
          </View>
        );
}

