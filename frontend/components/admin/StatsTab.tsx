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

	// Calculer les variations mensuelles (Δ)
	const getVariationData = () => {
		const evolution = stats.evolutionMensuelle ?? [];
		if (evolution.length < 2) return null;

		const current = evolution[evolution.length - 1];
		const previous = evolution[evolution.length - 2];

		const servicesDelta = current.services - previous.services;
		const servicesPercent =
			previous.services > 0
				? ((servicesDelta / previous.services) * 100).toFixed(1)
				: 0;

		const revenueDelta = current.revenue - previous.revenue;
		const revenuePercent =
			previous.revenue > 0
				? ((revenueDelta / previous.revenue) * 100).toFixed(1)
				: 0;

		return {
			services: { delta: servicesDelta, percent: servicesPercent },
			revenue: { delta: revenueDelta, percent: revenuePercent },
			currentMonth: current.mois,
			previousMonth: previous.mois,
		};
	};

	// Calculer le ratio CA/Commission
	const getCommissionRatio = () => {
		if (stats.chiffreAffaires === 0) return 0;
		return ((stats.commissionPerçue / stats.chiffreAffaires) * 100).toFixed(1);
	};

	const variationData = getVariationData();
	const commissionRatio = getCommissionRatio();

	// Composant pour afficher une variation colorée
	const DeltaIndicator = ({ label, value, percent }: any) => {
		const isPositive = value >= 0;
		const bgColor = isPositive ? '#E8F5E9' : '#FFEBEE';
		const textColor = isPositive ? '#2E7D32' : '#C62828';
		const arrow = isPositive ? '📈' : '📉';

		return (
			<View
				style={{
					marginVertical: 8,
					paddingHorizontal: 12,
					paddingVertical: 6,
					backgroundColor: bgColor,
					borderRadius: 6,
				}}
			>
				<Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
					{label}
				</Text>
				<Text style={{ fontSize: 14, fontWeight: 'bold', color: textColor }}>
					{arrow} {isPositive ? '+' : ''}{percent}%
				</Text>
				<Text style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
					vs mois précédent
				</Text>
			</View>
		);
	};

	return (
		<ScrollView style={{ flex: 1, padding: 12 }}>
			<View style={styles.statsHeader}>
				<Text style={styles.sectionTitle}>📊 Statistiques</Text>
				<TouchableOpacity
					style={styles.refreshBtn}
					onPress={onRefresh}
					disabled={loadingStats}
				>
					<Text style={styles.refreshBtnTxt}>
						{loadingStats ? '⏳' : '🔄'} Actualiser
					</Text>
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
						<View style={styles.kpiCardPrimary}>
							<Text style={styles.statNumber}>{stats.totalUsers}</Text>
							<Text style={styles.statLabel}>👥 Utilisateurs</Text>
						</View>

						<View style={styles.kpiCardPrimary}>
							<Text style={styles.statNumber}>{stats.servicesRealises}</Text>
							<Text style={styles.statLabel}>✅ Services réalisés</Text>
						</View>

						<View style={styles.kpiCardPrimary}>
							<Text style={styles.statNumber}>{stats.conversationsActives}</Text>
							<Text style={styles.statLabel}>💬 Conversations actives</Text>
						</View>

						<View style={styles.kpiCardPrimary}>
							<Text style={styles.statNumber}>
								{stats.evaluationMoyenne.toFixed(1)}/5
							</Text>
							<Text style={styles.statLabel}>
								⭐ Note moyenne ({stats.totalAvis})
							</Text>
						</View>
					</View>

					{/* Variations mensuelles */}
					{variationData && (
						<View style={{ marginVertical: 16, paddingHorizontal: 12 }}>
							<Text style={styles.subsectionTitle}>
								📊 Variations du mois
							</Text>
							<DeltaIndicator
								label="Services réalisés"
								value={variationData.services.delta}
								percent={variationData.services.percent}
							/>
							<DeltaIndicator
								label="Revenus totaux"
								value={variationData.revenue.delta}
								percent={variationData.revenue.percent}
							/>
						</View>
					)}

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

					{/* Ratio CA/Commission */}
					<View
						style={{
							marginTop: 12,
							paddingHorizontal: 12,
							paddingVertical: 10,
							backgroundColor: '#F5F5F5',
							borderRadius: 8,
							borderLeftWidth: 4,
							borderLeftColor: '#FF9800',
						}}
					>
						<Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
							Ratio Commission/CA
						</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text
								style={{
									fontSize: 24,
									fontWeight: 'bold',
									color: '#FF9800',
									marginRight: 8,
								}}
							>
								{commissionRatio}%
							</Text>
							<View
								style={{
									flex: 1,
									height: 6,
									backgroundColor: '#E0E0E0',
									borderRadius: 3,
								}}
							>
								<View
									style={{
										height: 6,
										backgroundColor: '#FF9800',
										borderRadius: 3,
										width: `${Math.min(
											parseFloat(commissionRatio as string),
											100
										)}%`,
									}}
								/>
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
										<View
											style={[styles.serviceBar, { width: `${pct}%` }]}
										/>
									</View>

									<Text style={styles.serviceCount}>{m.services}</Text>
								</View>
							);
						})}
					</View>

					{/* Top secteurs */}
					<View style={styles.chartSection}>
						<Text style={styles.subsectionTitle}>
							🏷️ Top secteurs (revenus)
						</Text>

						{(stats.topSecteursParRevenus ?? []).length === 0 ? (
							<Text style={styles.muted}>
								Pas encore de revenus par secteur.
							</Text>
						) : (
							(stats.topSecteursParRevenus ?? []).map((s, idx) => (
								<View key={idx} style={[styles.secteurRow, styles.tableRowActive]}>
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
								Dernière mise à jour :{' '}
								{new Date(stats.lastUpdate).toLocaleString('fr-FR')}
							</Text>
						</View>
					) : null}
				</>
			)}
		</ScrollView>
	);
}
