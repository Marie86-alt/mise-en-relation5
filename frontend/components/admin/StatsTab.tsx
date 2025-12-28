// components/admin/StatsTab.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { StatsUI } from './AdminTypes';

export function StatsTab({
  stats,
  loadingStats,
  onRefresh,
  styles,
}: {
  stats: StatsUI;
  loadingStats: boolean;
  onRefresh: () => void;
  styles: any;
}) {
  const maxServices =
    Math.max(...(stats.evolutionMensuelle?.map((m) => m.services) ?? [0])) || 1;

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <View style={styles.statsHeader}>
        <Text style={styles.sectionTitle}>📊 Statistiques</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loadingStats}>
          <Text style={styles.refreshBtnTxt}>{loadingStats ? '⏳' : '🔄'} Actualiser</Text>
        </TouchableOpacity>
      </View>

      {loadingStats ? (
        <View style={styles.loadingStats}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Calcul des statistiques...</Text>
        </View>
      ) : (
        <>
          {/* KPI principaux */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>👥 Utilisateurs</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.servicesRealises}</Text>
              <Text style={styles.statLabel}>✅ Services réalisés</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.conversationsActives}</Text>
              <Text style={styles.statLabel}>💬 Conversations actives</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.evaluationMoyenne.toFixed(1)}/5</Text>
              <Text style={styles.statLabel}>⭐ Note moyenne ({stats.totalAvis})</Text>
            </View>
          </View>

          {/* Finances */}
          <View style={styles.financeSection}>
            <Text style={styles.subsectionTitle}>💰 Finances</Text>
            <View style={styles.financeGrid}>
              <View style={[styles.statCard, styles.financeCard]}>
                <Text style={[styles.statNumber, styles.financeNumber]}>
                  {stats.chiffreAffaires.toFixed(2)}€
                </Text>
                <Text style={styles.statLabel}>Chiffre d&apos;affaires</Text>
              </View>
              <View style={[styles.statCard, styles.financeCard]}>
                <Text style={[styles.statNumber, styles.financeNumber]}>
                  {stats.commissionPerçue.toFixed(2)}€
                </Text>
                <Text style={styles.statLabel}>Commission</Text>
              </View>
            </View>
          </View>

          {/* Mini évolution (services) */}
          <View style={styles.chartSection}>
            <Text style={styles.subsectionTitle}>📈 Évolution (services)</Text>

            {(stats.evolutionMensuelle ?? []).slice(-6).map((m, idx) => {
              const pct = Math.max(8, (m.services / maxServices) * 100);
              return (
                <View key={idx} style={styles.chartRow}>
                  <Text style={styles.monthName}>{m.mois}</Text>

                  <View style={styles.barContainer}>
                    <View style={[styles.serviceBar, { width: `${pct}%` }]} />
                  </View>

                  <Text style={styles.serviceCount}>{m.services}</Text>
                </View>
              );
            })}
          </View>

          {/* Top secteurs */}
          <View style={styles.chartSection}>
            <Text style={styles.subsectionTitle}>🏷️ Top secteurs (revenus)</Text>

            {(stats.topSecteursParRevenus ?? []).length === 0 ? (
              <Text style={styles.muted}>Pas encore de revenus par secteur.</Text>
            ) : (
              (stats.topSecteursParRevenus ?? []).map((s, idx) => (
                <View key={idx} style={styles.secteurRow}>
                  <Text style={styles.secteurLeft}>{s.secteur}</Text>
                  <Text style={styles.secteurRight}>
                    {s.revenue}€ • {s.services} srv
                  </Text>
                </View>
              ))
            )}
          </View>

          {stats.lastUpdate ? (
            <View style={styles.updateInfo}>
              <Text style={styles.updateText}>
                Dernière mise à jour : {new Date(stats.lastUpdate).toLocaleString('fr-FR')}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
