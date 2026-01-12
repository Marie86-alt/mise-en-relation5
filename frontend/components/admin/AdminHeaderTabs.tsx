// components/admin/AdminHeaderTabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function TabBtn({
                  label,
    active,
    onPress,
    styles,
    badgeCount,
    badgeColor = 'red',
    theme
}: {
                  label: string;
                  active: boolean;
                  onPress: () => void;
                  styles: any;
    badgeCount?: number;
    badgeColor?: 'red' | 'green' | 'orange';
    theme: any;
}) {
    const badgeColorMap = {
          red: styles.tabBadgeRed,
          green: styles.tabBadgeGreen,
          orange: styles.tabBadgeOrange,
    };

  return (
        <TouchableOpacity
          style={[
            styles.tabBtn,
            active && styles.tabBtnActive,
            {
              backgroundColor: active ? '#e67e22' : theme.surface,
              borderColor: active ? '#e67e22' : theme.border,
              borderWidth: 1
            }
          ]}
          onPress={onPress}
        >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.tabTxt, active && styles.tabTxtActive, { color: active ? '#fff' : theme.text }]}>{label}</Text>
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
    theme,
}: {
    tab: 'validations' | 'users' | 'conversations' | 'stats';
    setTab: (t: 'validations' | 'users' | 'conversations' | 'stats') => void;
    pendingCount: number;
    usersCount: number;
    conversationsCount: number;
    styles: any;
    theme: any;
}) {
    return (
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                  <Text style={[styles.title, { color: theme.text, fontSize: 20 }]}>Panel Admin</Text>
                  <View style={styles.tabs}>
                            <TabBtn
                                        active={tab === 'validations'}
                              onPress={() => setTab('validations')}
                              label="Validations"
                              styles={styles}
                                        badgeCount={pendingCount}
                                        badgeColor={pendingCount > 5 ? 'red' : 'orange'}
                                        theme={theme}
                                      />
                            <TabBtn
                                        active={tab === 'users'}
                              onPress={() => setTab('users')}
                              label="Utilisateurs"
                              styles={styles}
                                        badgeCount={usersCount}
                                        badgeColor="green"
                                        theme={theme}
                                      />
                            <TabBtn
                                        active={tab === 'conversations'}
                              onPress={() => setTab('conversations')}
                              label="Conversations"
                              styles={styles}
                                        badgeCount={conversationsCount}
                                        badgeColor="orange"
                                        theme={theme}
                                      />
                            <TabBtn
                                        active={tab === 'stats'}
                              onPress={() => setTab('stats')}
                              label="📊 Stats"
                              styles={styles}
                                        theme={theme}
                                      />
                  </View>
          </View>
        );
}

