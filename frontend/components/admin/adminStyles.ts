// components/admin/adminStyles.ts

import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#11181C', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f3f5' },
  tabBtnActive: { backgroundColor: Colors.light.primary + '20' },
  tabTxt: { color: '#495057', fontWeight: '600', fontSize: 12 },
  tabTxtActive: { color: Colors.light.primary },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  email: { fontSize: 13, color: '#687076', marginTop: 2 },
  meta: { fontSize: 12, color: '#6c757d', marginTop: 6 },

  actionButtons: { flexDirection: 'row', gap: 8 },
  primary: { backgroundColor: Colors.light.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  success: { backgroundColor: Colors.light.success, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  warning: { backgroundColor: '#f39c12', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  danger: { backgroundColor: Colors.light.danger, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  muted: { textAlign: 'center', color: '#687076', marginTop: 20 },

  search: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeBtn: { color: Colors.light.primary, fontSize: 16, fontWeight: '600' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  msgAuthor: { fontSize: 14, fontWeight: '700', color: Colors.light.primary },
  msgText: { fontSize: 14, color: '#2c3e50', marginTop: 4, lineHeight: 20 },
  msgTime: { fontSize: 11, color: '#6c757d', marginTop: 4 },
  deleteMsg: { backgroundColor: Colors.light.danger, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },

  // STATS
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshBtn: { backgroundColor: Colors.light.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  refreshBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingStats: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, color: '#687076', fontSize: 14 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: Colors.light.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#687076', textAlign: 'center', fontWeight: '500' },

  financeSection: { marginBottom: 20 },
  subsectionTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  financeGrid: { flexDirection: 'row', gap: 12 },
  financeCard: { backgroundColor: '#f8f9fa' },
  financeNumber: { color: '#28a745' },

  updateInfo: { marginTop: 20, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
  updateText: { fontSize: 12, color: '#6b7280', textAlign: 'center' },

  // MINI CHART + TOP SECTEURS (ajouté)
  chartSection: { marginBottom: 18 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  monthName: { width: 90, fontSize: 12, color: '#374151' },
  barContainer: { flex: 1, height: 10, backgroundColor: '#eef2f7', borderRadius: 999, overflow: 'hidden' },
  serviceBar: { height: 10, backgroundColor: Colors.light.primary, borderRadius: 999 },
  serviceCount: { width: 30, textAlign: 'right', fontSize: 12, color: '#374151' },

  secteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  secteurLeft: { flex: 1, fontSize: 13, fontWeight: '700', color: '#11181C' },
  secteurRight: { fontSize: 12, color: '#6b7280' },

   // NIVEAU 1 - UX/UI IMPROVEMENTS

   // Table rows by status (recoloring)
   tableRowActive: { backgroundColor: '#e8f5e9', borderLeftWidth: 4, borderLeftColor: '#4caf50' },
 tableRowPending: { backgroundColor: '#fff3e0', borderLeftWidth: 4, borderLeftColor: '#ff9800' },
 tableRowWarning: { backgroundColor: '#fff3e0', borderLeftWidth: 4, borderLeftColor: '#ff6f00' },
 tableRowError: { backgroundColor: '#ffebee', borderLeftWidth: 4, borderLeftColor: '#f44336' },
 tableRowInactive: { backgroundColor: '#f5f5f5', borderLeftWidth: 4, borderLeftColor: '#9e9e9e' },

 // Tab badges (colored badges on admin tabs)
 tabBadge: { 
      paddingVertical: 3, 
           paddingHorizontal: 6, 
           borderRadius: 12, 
           marginLeft: 6,
           backgroundColor: Colors.light.danger,
           minWidth: 20,
           alignItems: 'center',
           justifyContent: 'center'
 },
 tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
 tabBadgeGreen: { backgroundColor: Colors.light.success },
 tabBadgeOrange: { backgroundColor: '#ff9800' },
 tabBadgeRed: { backgroundColor: Colors.light.danger },

 // KPI Cards with colored borders
 kpiCardPrimary: {
      backgroundColor: '#fff',
           borderWidth: 2,
           borderColor: Colors.light.primary,
           borderLeftWidth: 5,
           borderLeftColor: Colors.light.primary,
           borderRadius: 12,
           padding: 16,
           marginBottom: 12,
        },
         kpiCardSuccess: {
              backgroundColor: '#fff',
   borderWidth: 2,
                   borderColor: Colors.light.success,
                   borderLeftWidth: 5,
                   borderLeftColor: Colors.light.success,
                   borderRadius: 12,
                   padding: 16,
                   marginBottom: 12,
                },
                 kpiCardWarning: {
                      backgroundColor: '#fff',
                           borderWidth: 2,
                           borderColor: '#ff9800',
                           borderLeftWidth: 5,
                           borderLeftColor: '#ff9800',
                           borderRadius: 12,
                           padding: 16,
                           marginBottom: 12,
                        },
                         kpiCardDanger: {
                              backgroundColor: '#fff',
                                   borderWidth: 2,
                                   borderColor: Colors.light.danger,
                                   borderLeftWidth: 5,
                                   borderLeftColor: Colors.light.danger,
                                   borderRadius: 12,
                                   padding: 16,
                                   marginBottom: 12,
                                },
                                 kpiTitle: { fontSize: 12, color: '#687076', fontWeight: '500', marginBottom: 8 },
 kpiValue: { fontSize: 28, fontWeight: '800', color: '#11181C', marginBottom: 4 },
 kpiChange: { fontSize: 13, fontWeight: '600' },
});

