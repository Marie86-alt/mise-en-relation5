// components/admin/adminStyles.ts - NIVEAU 3: Micro-animations, Transitions & Performance
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

// ==================== NIVEAU 3: ANIMATIONS & TRANSITIONS ====================

// Constantes pour les ombres sophistiquées (box-shadow)
const shadows = {
    light: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    medium: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    deep: { elevation: 8, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    elevated: { elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
};

// Constantes pour l'espacement standardisé
const spacing = {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
};

export const s = StyleSheet.create({
    // ==================== BASE STYLES ====================
                                     center: { 
      flex: 1, 
                                           justifyContent: 'center', 
                                           alignItems: 'center', 
                                           backgroundColor: '#fff',
                                           ...shadows.light,
                                     },

    header: { 
      padding: spacing.lg,
          marginBottom: spacing.md,
          borderBottomWidth: 1, 
          borderBottomColor: '#f0f0f0', 
          backgroundColor: '#fff',
          ...shadows.light,
    },

    title: { 
      fontSize: 20, 
          fontWeight: '700', 
          color: '#11181C', 
          marginBottom: spacing.lg,
          letterSpacing: -0.4,
    },

    // ==================== TABS & NAVIGATION ====================
    tabs: { 
      flexDirection: 'row', 
          gap: spacing.md, 
          flexWrap: 'wrap',
          marginBottom: spacing.md,
    },

    tabBtn: { 
      paddingVertical: spacing.sm, 
          paddingHorizontal: spacing.md, 
          borderRadius: 12,
          backgroundColor: '#f5f7fa',
          borderWidth: 1,
          borderColor: '#e8eef5',
          ...shadows.light,
    },

    tabBtnActive: { 
      backgroundColor: Colors.light.primary + '15',
          borderColor: Colors.light.primary,
          borderWidth: 2,
          ...shadows.medium,
    },

    tabTxt: { 
      color: '#495057', 
          fontWeight: '600', 
          fontSize: 12,
          letterSpacing: 0.3,
    },

    tabTxtActive: { 
      color: Colors.light.primary,
          fontWeight: '700',
    },

    sectionTitle: { 
      fontSize: 16, 
          fontWeight: '700', 
          color: '#2c3e50', 
          marginBottom: spacing.md,
          marginTop: spacing.lg,
          letterSpacing: -0.3,
    },

    // ==================== CARDS & CONTAINERS ====================
    card: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 14,
          padding: spacing.lg,
          backgroundColor: '#fff',
          gap: spacing.md,
          marginBottom: spacing.md,
          ...shadows.medium,
          borderWidth: 1,
          borderColor: '#f0f0f0',
    },

    cardHover: {
          ...shadows.deep,
          transform: [{ scale: 1.02 }],
    },

    name: { 
      fontSize: 16, 
          fontWeight: '700', 
          color: '#2c3e50',
          marginBottom: spacing.xs,
    },

    email: { 
      fontSize: 13, 
          color: '#687076', 
          marginTop: spacing.xs,
          fontWeight: '500',
    },

    meta: { 
      fontSize: 12, 
          color: '#6c757d', 
          marginTop: spacing.sm,
          fontWeight: '400',
    },

    // ==================== ACTION BUTTONS ====================
    actionButtons: { 
      flexDirection: 'row', 
          gap: spacing.sm,
          marginTop: spacing.md,
    },

    primary: { 
      backgroundColor: Colors.light.primary, 
          paddingVertical: spacing.sm, 
          paddingHorizontal: spacing.md, 
          borderRadius: 10,
          ...shadows.light,
    },

    success: { 
      backgroundColor: Colors.light.success, 
          paddingVertical: spacing.sm, 
          paddingHorizontal: spacing.md, 
          borderRadius: 10,
          ...shadows.light,
    },

    warning: { 
      backgroundColor: '#f39c12', 
          paddingVertical: spacing.sm, 
          paddingHorizontal: spacing.md, 
          borderRadius: 10,
          ...shadows.light,
    },

    danger: { 
      backgroundColor: Colors.light.danger, 
          paddingVertical: spacing.sm, 
          paddingHorizontal: spacing.md, 
          borderRadius: 10,
          ...shadows.light,
    },

    btnTxt: { 
      color: '#fff', 
          fontWeight: '700', 
          fontSize: 12,
          letterSpacing: 0.2,
    },

    muted: { 
      textAlign: 'center', 
          color: '#687076', 
          marginTop: spacing.xl,
          fontWeight: '500',
    },

    // ==================== SEARCH & INPUT ====================
    search: {
          borderWidth: 1,
          borderColor: '#e8eef5',
          borderRadius: 12,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
          backgroundColor: '#f9fafb',
          ...shadows.light,
    },

    // ==================== MODAL STYLES ====================
    modalHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: '#e8eef5',
          backgroundColor: '#fff',
          ...shadows.light,
    },

    closeBtn: { 
      color: Colors.light.primary, 
          fontSize: 16, 
          fontWeight: '600',
    },

    modalTitle: { 
      flex: 1, 
          textAlign: 'center', 
          fontSize: 18, 
          fontWeight: '700', 
          color: '#2c3e50',
          letterSpacing: -0.3,
    },

    // ==================== MESSAGES ====================
    messageCard: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderRadius: 12,
          padding: spacing.lg,
          marginBottom: spacing.md,
          gap: spacing.md,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#f0f0f0',
          ...shadows.light,
    },

    msgAuthor: { 
      fontSize: 14, 
          fontWeight: '700', 
          color: Colors.light.primary,
          marginBottom: spacing.xs,
    },

    msgText: { 
      fontSize: 14, 
          color: '#2c3e50', 
          marginTop: spacing.sm, 
          lineHeight: 20,
          fontWeight: '500',
    },

    msgTime: { 
      fontSize: 11, 
          color: '#6c757d', 
          marginTop: spacing.sm,
          fontWeight: '400',
    },

    deleteMsg: { 
      backgroundColor: Colors.light.danger, 
          paddingVertical: spacing.xs, 
          paddingHorizontal: spacing.sm, 
          borderRadius: 8,
          ...shadows.light,
    },

    // ==================== STATS SECTION ====================
    statsHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
    },

    refreshBtn: { 
      backgroundColor: Colors.light.primary, 
          paddingHorizontal: spacing.md, 
          paddingVertical: spacing.sm, 
          borderRadius: 10,
          ...shadows.medium,
    },

    refreshBtnTxt: { 
      color: '#fff', 
          fontSize: 12, 
          fontWeight: '600',
          letterSpacing: 0.2,
    },

    loadingStats: { 
      alignItems: 'center', 
          justifyContent: 'center', 
          paddingVertical: 40,
    },

    loadingText: { 
      marginTop: spacing.lg, 
          color: '#687076', 
          fontSize: 14,
          fontWeight: '500',
    },

    statsGrid: { 
      flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: spacing.lg, 
          marginBottom: spacing.xl,
    },

    statCard: {
          flex: 1,
          minWidth: '45%',
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: spacing.lg,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#f0f0f0',
          ...shadows.medium,
    },

    statCardHover: {
          ...shadows.deep,
          transform: [{ scale: 1.03 }],
    },

    statNumber: { 
      fontSize: 28, 
          fontWeight: '800', 
          color: Colors.light.primary, 
          marginBottom: spacing.sm,
    },

    statLabel: { 
      fontSize: 12, 
          color: '#687076', 
          textAlign: 'center', 
          fontWeight: '600',
          letterSpacing: 0.2,
    },

    // ==================== FINANCE SECTION ====================
    financeSection: { 
      marginBottom: spacing.xl,
    },

    subsectionTitle: { 
      fontSize: 16, 
          fontWeight: '700', 
          color: '#2c3e50', 
          marginBottom: spacing.lg,
          marginTop: spacing.xl,
          letterSpacing: -0.3,
    },

    financeGrid: { 
      flexDirection: 'row', 
          gap: spacing.lg,
    },

    financeCard: { 
      backgroundColor: '#f8f9fa',
          flex: 1,
          padding: spacing.lg,
          borderRadius: 12,
          ...shadows.light,
          borderWidth: 1,
          borderColor: '#e8eef5',
    },

    financeNumber: { 
      color: '#28a745',
          fontSize: 20,
          fontWeight: '700',
          marginTop: spacing.sm,
    },

    updateInfo: { 
      marginTop: spacing.xl, 
          padding: spacing.lg, 
          backgroundColor: '#f9fafb', 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e8eef5',
          ...shadows.light,
    },

    updateText: { 
      fontSize: 12, 
          color: '#6b7280', 
          textAlign: 'center',
          fontWeight: '500',
          lineHeight: 18,
    },

    // ==================== CHARTS & VISUALS ====================
    chartSection: { 
      marginBottom: spacing.xl,
    },

    chartRow: { 
      flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: spacing.md, 
          gap: spacing.md,
          paddingVertical: spacing.sm,
    },

    monthName: { 
      width: 90, 
          fontSize: 12, 
          color: '#374151',
          fontWeight: '600',
    },

    barContainer: { 
      flex: 1, 
          height: 12, 
          backgroundColor: '#e8eef5', 
          borderRadius: 10, 
          overflow: 'hidden',
          ...shadows.light,
    },

    serviceBar: { 
      height: 12, 
          backgroundColor: Colors.light.primary, 
          borderRadius: 10,
    },

    serviceCount: { 
      width: 40, 
          textAlign: 'right', 
          fontSize: 12, 
          color: '#374151',
          fontWeight: '600',
    },

    secteurRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderWidth: 1,
          borderColor: '#f0f0f0',
          borderRadius: 12,
          backgroundColor: '#fff',
          marginBottom: spacing.md,
          ...shadows.light,
    },

    secteurLeft: { 
      flex: 1, 
          fontSize: 13, 
          fontWeight: '700', 
          color: '#11181C',
    },

    secteurRight: { 
      fontSize: 12, 
          color: '#6b7280',
          fontWeight: '600',
    },

    // ==================== NIVEAU 1 - STATUS INDICATORS ====================
    tableRowActive: { 
      backgroundColor: '#ecf8f3', 
          borderLeftWidth: 5, 
          borderLeftColor: '#10b981',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
    },

    tableRowPending: { 
      backgroundColor: '#fffbeb', 
          borderLeftWidth: 5, 
          borderLeftColor: '#f59e0b',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
    },

    tableRowWarning: { 
      backgroundColor: '#fef3c7', 
          borderLeftWidth: 5, 
          borderLeftColor: '#ff9800',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
    },

    tableRowError: { 
      backgroundColor: '#fee2e2', 
          borderLeftWidth: 5, 
          borderLeftColor: '#ef4444',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
    },

    tableRowInactive: { 
      backgroundColor: '#f5f7fa', 
          borderLeftWidth: 5, 
          borderLeftColor: '#9ca3af',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
    },

    // ==================== BADGES ====================
    tabBadge: { 
      paddingVertical: spacing.xs, 
          paddingHorizontal: spacing.sm, 
          borderRadius: 14, 
          marginLeft: spacing.sm,
          backgroundColor: Colors.light.danger,
          minWidth: 24,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.light,
    },

    tabBadgeText: { 
      fontSize: 10, 
          fontWeight: '700', 
          color: '#fff',
          letterSpacing: 0.2,
    },

    tabBadgeGreen: { 
      backgroundColor: Colors.light.success,
    },

    tabBadgeOrange: { 
      backgroundColor: '#f59e0b',
    },

    tabBadgeRed: { 
      backgroundColor: Colors.light.danger,
    },

    // ==================== KPI CARDS ====================
    kpiCardPrimary: {
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: Colors.light.primary + '30',
          borderLeftWidth: 6,
          borderLeftColor: Colors.light.primary,
          borderRadius: 14,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.medium,
    },

    kpiCardSuccess: {
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: Colors.light.success + '30',
          borderLeftWidth: 6,
          borderLeftColor: Colors.light.success,
          borderRadius: 14,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.medium,
    },

    kpiCardWarning: {
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: '#f59e0b' + '30',
          borderLeftWidth: 6,
          borderLeftColor: '#f59e0b',
          borderRadius: 14,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.medium,
    },

    kpiCardDanger: {
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: Colors.light.danger + '30',
          borderLeftWidth: 6,
          borderLeftColor: Colors.light.danger,
          borderRadius: 14,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          ...shadows.medium,
    },

    kpiTitle: { 
      fontSize: 12, 
          color: '#687076', 
          fontWeight: '600', 
          marginBottom: spacing.sm,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
    },

    kpiValue: { 
      fontSize: 32, 
          fontWeight: '800', 
          color: '#11181C', 
          marginBottom: spacing.xs,
          letterSpacing: -1,
    },

    kpiChange: { 
      fontSize: 13, 
          fontWeight: '600',
          color: Colors.light.success,
          marginTop: spacing.xs,
    },

    // ==================== NIVEAU 3 - ADVANCED STYLING ====================
    // Amélioration des espacements internes
    container: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
    },

    containerLarge: {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
    },

    // Ombres et profondeur avancées
    shadowContainer: {
          backgroundColor: '#fff',
          borderRadius: 14,
          ...shadows.elevated,
          padding: spacing.lg,
          marginBottom: spacing.lg,
    },

    // Indicateurs visuels améliorés
    indicator: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: spacing.sm,
    },

    indicatorSuccess: {
          backgroundColor: '#10b981',
    },

    indicatorWarning: {
          backgroundColor: '#f59e0b',
    },

    indicatorDanger: {
          backgroundColor: '#ef4444',
    },

    indicatorPending: {
          backgroundColor: '#6b7280',
    },

    // Badge avancés
    badgeContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: 12,
          backgroundColor: '#f0f0f0',
    },

    badgeText: {
          fontSize: 11,
          fontWeight: '600',
          color: '#2c3e50',
          marginLeft: spacing.xs,
    },

    // Optimisation pour la performance (memoization)
    // Les images et composants utilisant useMemo devraient référencer ces styles
    memoizedCard: {
          borderRadius: 14,
          padding: spacing.lg,
          backgroundColor: '#fff',
          ...shadows.light,
    },

    // Lazy loading placeholders
    skeletonLoader: {
          backgroundColor: '#e8eef5',
          borderRadius: 10,
          marginBottom: spacing.md,
          minHeight: 60,
    },

    // Animations et transitions
    fadeInContainer: {
          opacity: 1,
          backgroundColor: '#fff',
    },

    slideInContainer: {
          transform: [{ translateX: 0 }],
    },

    scaleInContainer: {
          transform: [{ scale: 1 }],
    },

    // États au survol (hover)
    buttonHoverState: {
          ...shadows.deep,
          opacity: 0.95,
    },

    cardPressableState: {
          ...shadows.light,
          backgroundColor: '#f9fafb',
    },

    // Contraste visuel amélioré
    highContrastText: {
          color: '#11181C',
          fontWeight: '700',
          letterSpacing: 0.1,
    },

    // Icônes et visuels
    iconSmall: {
          width: 20,
          height: 20,
          marginRight: spacing.sm,
    },

    iconMedium: {
          width: 24,
          height: 24,
          marginRight: spacing.md,
    },

    iconLarge: {
          width: 32,
          height: 32,
          marginRight: spacing.lg,
    },

    // Textes améliorés
    textSmall: {
          fontSize: 12,
          fontWeight: '500',
          color: '#6b7280',
          letterSpacing: 0.2,
    },

    textMedium: {
          fontSize: 14,
          fontWeight: '600',
          color: '#2c3e50',
          letterSpacing: 0.1,
    },

    textLarge: {
          fontSize: 16,
          fontWeight: '700',
          color: '#11181C',
          letterSpacing: -0.2,
    },
});
