// components/admin/PricingTab.tsx
// Édition de la configuration tarifaire (Firestore `config/pricing`) par un administrateur.
// Les valeurs saisies sont validées par sanitizePricingConfig ; un aperçu des prix est calculé
// en direct avec exactement le même code que l'application.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { usePricing } from '@/contexts/PricingContext';
import { useToast } from '@/contexts/ToastContext';
import { savePricingConfig } from '@/src/services/firebase/pricingConfigService';
import { formatRate, sanitizePricingConfig, type PricingConfig } from '@/src/config/pricingConfig';
import { PricingService } from '@/src/utils/pricing';
import ErrorService from '@/src/services/errorService';
import type { ThemeColors } from '@/constants/themes';

const toNumber = (s: string) => Number(String(s).replace(',', '.'));
const fmtEuro = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;

export function PricingTab({ theme }: { theme: ThemeColors }) {
  const { user } = useAuth();
  const { pricing, exists, isFallback, updatedAt, loading } = usePricing();
  const toast = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [hourlyRate, setHourlyRate] = useState('');
  const [minHours, setMinHours] = useState('');
  const [offerHours, setOfferHours] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [depositPct, setDepositPct] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pré-remplir depuis la configuration courante tant que l'admin n'a rien modifié
  useEffect(() => {
    if (dirty) return;
    setHourlyRate(String(pricing.hourlyRate));
    setMinHours(String(pricing.minHours));
    const [firstOffer] = Object.entries(pricing.specialOffers);
    setOfferHours(firstOffer ? firstOffer[0] : '');
    setOfferPrice(firstOffer ? String(firstOffer[1]) : '');
    setDepositPct(String(Math.round(pricing.depositRate * 100)));
    setCommissionPct(String(Math.round(pricing.commissionRate * 100)));
  }, [pricing, dirty]);

  const field = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  const draft: PricingConfig = useMemo(
    () =>
      sanitizePricingConfig({
        hourlyRate: toNumber(hourlyRate),
        minHours: toNumber(minHours),
        depositRate: toNumber(depositPct) / 100,
        commissionRate: toNumber(commissionPct) / 100,
        specialOffers:
          offerHours.trim() && offerPrice.trim() ? { [String(Math.round(toNumber(offerHours)))]: toNumber(offerPrice) } : {},
        currency: pricing.currency,
      }),
    [hourlyRate, minHours, depositPct, commissionPct, offerHours, offerPrice, pricing.currency]
  );

  const offerIgnored =
    offerHours.trim() !== '' && offerPrice.trim() !== '' && Object.keys(draft.specialOffers).length === 0;

  const apercu = useMemo(() => {
    const hours = Array.from(new Set([draft.minHours, draft.minHours + 1, draft.minHours + 2, 8])).sort((a, b) => a - b);
    return hours.map((h) => ({ h, r: PricingService.calculatePrice(h, draft) }));
  }, [draft]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await savePricingConfig(draft, user.uid);
      setDirty(false);
      toast.success('Les nouveaux tarifs sont appliqués immédiatement dans l’application.', 'Tarifs enregistrés');
    } catch (error: any) {
      ErrorService.logError('PRICING_SAVE', error?.message, 'PricingTab', 'error');
      toast.error(ErrorService.handleFirebaseError(error), 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    value,
    onChange,
    suffix,
    hint,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    suffix: string;
    hint?: string;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          editable={!saving}
          accessibilityLabel={label}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tarifs de la plateforme</Text>
      <Text style={styles.subtitle}>
        Ces valeurs s&apos;appliquent à toute l&apos;application et au serveur de paiement, sans nouvelle version.
      </Text>

      {isFallback ? (
        <View style={[styles.notice, { borderColor: theme.danger }]}>
          <Ionicons name="cloud-offline-outline" size={18} color={theme.danger} />
          <Text style={styles.noticeText}>Firestore injoignable : valeurs par défaut affichées.</Text>
        </View>
      ) : !exists ? (
        <View style={[styles.notice, { borderColor: theme.warning }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.warning} />
          <Text style={styles.noticeText}>
            Aucune configuration enregistrée : l&apos;application utilise les valeurs par défaut. Enregistrez pour créer le document.
          </Text>
        </View>
      ) : updatedAt ? (
        <Text style={styles.meta}>Dernière modification : {updatedAt.toLocaleString('fr-FR')}</Text>
      ) : null}

      <View style={styles.card}>
        <Field label="Tarif horaire" value={hourlyRate} onChange={field(setHourlyRate)} suffix="€ / h" />
        <Field label="Durée minimale d'un service" value={minHours} onChange={field(setMinHours)} suffix="h" />
        <View style={styles.offerRow}>
          <View style={styles.offerCol}>
            <Field label="Offre : durée" value={offerHours} onChange={field(setOfferHours)} suffix="h" />
          </View>
          <View style={styles.offerCol}>
            <Field label="Offre : prix total" value={offerPrice} onChange={field(setOfferPrice)} suffix="€" />
          </View>
        </View>
        {offerIgnored ? (
          <Text style={[styles.hint, { color: theme.warning }]}>
            Offre ignorée : elle doit porter sur au moins {draft.minHours} h et être moins chère que le tarif normal.
          </Text>
        ) : (
          <Text style={styles.hint}>Laissez vide pour ne proposer aucun forfait.</Text>
        )}
        <Field
          label="Acompte à la réservation"
          value={depositPct}
          onChange={field(setDepositPct)}
          suffix="%"
          hint="Le solde est réglé après le service."
        />
        <Field
          label="Commission plateforme"
          value={commissionPct}
          onChange={field(setCommissionPct)}
          suffix="%"
          hint="Enregistrée sur chaque transaction par le serveur de paiement."
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aperçu</Text>
        {apercu.map(({ h, r }) => (
          <View key={h} style={styles.previewRow}>
            <Text style={styles.previewLabel}>{h} h</Text>
            <Text style={styles.previewValue}>
              {r.error ? '—' : fmtEuro(r.finalPrice)}
              {!r.error && r.discount > 0 ? <Text style={styles.previewNote}>  (au lieu de {fmtEuro(r.basePrice)})</Text> : null}
            </Text>
          </View>
        ))}
        <Text style={styles.hint}>
          Acompte {formatRate(draft.depositRate)} · commission {formatRate(draft.commissionRate)} · l&apos;aidant reçoit{' '}
          {formatRate(1 - draft.commissionRate)}.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
        onPress={save}
        disabled={!dirty || saving}
        accessibilityRole="button"
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer les tarifs</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    meta: { fontSize: 12, color: theme.textTertiary },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, backgroundColor: theme.surface },
    noticeText: { flex: 1, fontSize: 13, color: theme.text, lineHeight: 18 },
    card: { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: theme.text },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
      minHeight: 44,
    },
    suffix: { fontSize: 14, color: theme.textSecondary, minWidth: 44 },
    hint: { fontSize: 12, color: theme.textTertiary, lineHeight: 17 },
    offerRow: { flexDirection: 'row', gap: 12 },
    offerCol: { flex: 1 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewLabel: { fontSize: 15, color: theme.textSecondary },
    previewValue: { fontSize: 15, fontWeight: '700', color: theme.primary },
    previewNote: { fontSize: 12, fontWeight: '400', color: theme.textTertiary },
    saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
