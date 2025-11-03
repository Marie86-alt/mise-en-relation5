// app/paiement-final.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Colors } from '@/constants/Colors';
import { STRIPE_CONFIG } from '../src/config/stripe';
import { PaymentData, PaymentService } from '../src/stripe/paymentService';

const fmt = (n: number) => `${n.toFixed(2)}€`;
const r2 = (n: number) => parseFloat(n.toFixed(2));

export default function PaiementFinalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const paymentDataStr = typeof params.paymentData === 'string' ? params.paymentData : '';
  const paymentData: PaymentData | null = useMemo(() => {
    if (!paymentDataStr) return null;
    try {
      return JSON.parse(paymentDataStr) as PaymentData;
    } catch {
      return null;
    }
  }, [paymentDataStr]);

  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const initDoneRef = useRef(false);

  // ---------- NORMALISATION DU TOTAL ----------
  const {
    totalCanonical,
    depositEuros,
    finalAmountEuros,
    normalizedPaymentData,
  } = useMemo(() => {
    const p = paymentData?.pricingData as any || {};

    // On tente de reconstruire le TOTAL (100%)
    const basePrice =
      typeof p.basePrice === 'number'
        ? p.basePrice
        : typeof p.hourlyRate === 'number' && typeof p.hours === 'number'
        ? p.hourlyRate * p.hours
        : 0;

    const discount = typeof p.discount === 'number' ? p.discount : 0;

    // total calculé depuis les champs de base si disponibles
    const totalFromBase = basePrice > 0 ? r2(Math.max(0, basePrice - discount)) : 0;

    // valeur transmise (parfois, c'était le SOLDE 80% ⇒ erreur)
    const incomingFinal = typeof p.finalPrice === 'number' ? r2(p.finalPrice) : 0;

    // Choix du total canonique :
    // - si on a basePrice/discount → on s'y fie (le plus sûr)
    // - sinon, on garde la valeur reçue (on suppose qu'elle est le total)
    const totalCanonical = totalFromBase > 0 ? totalFromBase : incomingFinal;

    // Montants attendus
    const depositEuros = r2(totalCanonical * 0.20);
    const finalAmountEuros = r2(totalCanonical - depositEuros);

    // On force le service Stripe à utiliser le TOTAL canonique
    const normalizedPaymentData: PaymentData | null = paymentData
      ? {
          ...paymentData,
          pricingData: {
            ...paymentData.pricingData,
            finalPrice: totalCanonical, // ⚠️ on met bien le TOTAL ici
          } as any,
        }
      : null;

    return { totalCanonical, depositEuros, finalAmountEuros, normalizedPaymentData };
  }, [paymentData]);

  const navigateBackWithSuccess = useCallback(() => {
    const baseParams: Record<string, string> = {
      paymentSuccess: 'true',
      paymentType: 'final',
      profileId: String(params.r_profileId || ''),
      profileName: String(params.r_profileName || ''),
      secteur: String(params.r_secteur || ''),
      jour: String(params.r_jour || ''),
      heureDebut: String(params.r_heureDebut || ''),
      heureFin: String(params.r_heureFin || ''),
      adresse: String(params.r_adresse || ''),
    };
    router.replace({ pathname: '/conversation' as const, params: baseParams });
  }, [params, router]);

  const initializePayment = useCallback(async () => {
    if (!normalizedPaymentData || totalCanonical <= 0) return;
    setLoading(true);
    try {
      // ✅ Le PI sera créé pour (TOTAL - 20%)
      const result = await PaymentService.initializeFinalPayment(normalizedPaymentData);
      if (result.success && result.paymentIntentId) {
        setPaymentIntentId(result.paymentIntentId);
        setPaymentReady(true);
      } else {
        Alert.alert("Erreur d'initialisation", "Impossible d'initialiser le paiement. Veuillez réessayer.");
      }
    } catch {
      Alert.alert('Erreur', 'Problème de connexion au service de paiement');
    } finally {
      setLoading(false);
    }
  }, [normalizedPaymentData, totalCanonical]);

  useEffect(() => {
    if (!paymentData) {
      Alert.alert('Erreur', 'Données de paiement manquantes', [{ text: 'Retour', onPress: () => router.back() }]);
      return;
    }
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      initializePayment();
    }
  }, [paymentData, initializePayment, router]);

  const handlePayment = async () => {
    if (!paymentReady || !paymentIntentId) return;
    setLoading(true);
    try {
      const result = await PaymentService.presentPaymentSheet();
      if (result.success) {
        const confirmResult = await PaymentService.confirmPayment(paymentIntentId);
        if (confirmResult.success) {
          Alert.alert(
            '✅ Paiement réussi !',
            `Le solde de ${fmt(finalAmountEuros)} a été réglé.\n\n` +
              `💼 Répartition sur ${fmt(totalCanonical)} :\n` +
              `• Aidant (60%) : ${fmt(r2(totalCanonical * 0.6))}\n` +
              `• Plateforme (40%) : ${fmt(r2(totalCanonical * 0.4))}`,
            [{ text: 'OK', onPress: navigateBackWithSuccess }],
          );
        } else {
          Alert.alert('Paiement effectué', "Confirmation serveur indisponible.", [
            { text: 'OK', onPress: navigateBackWithSuccess },
          ]);
        }
      } else if (result.error) {
        Alert.alert('Erreur de paiement', 'Le paiement n\'a pas pu être traité. Veuillez réessayer.');
      }
    } catch {
      Alert.alert('Erreur', 'Problème lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (!paymentData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>← Retour</Text>
            </TouchableOpacity>
            <Text style={styles.title}>💳 Paiement Final</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧾 Récapitulatif du paiement</Text>
            <Row label="Coût total du service" value={fmt(totalCanonical)} />
            <Row label="Acompte déjà versé (20%)" value={`-${fmt(depositEuros)}`} />
            <View style={styles.separator} />
            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>SOLDE À PAYER</Text>
              <Text style={styles.currentAmount}>{fmt(finalAmountEuros)}</Text>
            </View>
          </View>

          <View style={[styles.card, styles.splitCard]}>
            <Text style={styles.cardTitle}>💼 Répartition des revenus</Text>
            <Text style={styles.infoText}>
              Sur le montant total du service ({fmt(totalCanonical)}), les fonds seront répartis comme suit :
            </Text>
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <Text style={styles.splitLabel}>👤 Aidant (60%)</Text>
                <Text style={styles.splitAidant}>{fmt(r2(totalCanonical * 0.6))}</Text>
              </View>
              <View style={styles.splitCol}>
                <Text style={styles.splitLabel}>🏢 Plateforme (40%)</Text>
                <Text style={styles.splitPlatform}>{fmt(r2(totalCanonical * 0.4))}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.payButton, (!paymentReady || loading) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!paymentReady || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Payer {fmt(finalAmountEuros)}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </StripeProvider>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#2c3e50', textAlign: 'center' },
  backButton: { color: Colors.light.primary, fontSize: 16, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e9ecef' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#6c757d' },
  rowValue: { fontSize: 14, color: '#2c3e50', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginTop: 8 },
  currentLabel: { fontSize: 16, color: '#2c3e50', fontWeight: '600' },
  currentAmount: { fontSize: 20, color: Colors.light.primary, fontWeight: '700' },
  splitCard: { backgroundColor: '#fff8f0', borderColor: '#ffd4a3' },
  infoText: { fontSize: 14, color: '#6c757d', marginBottom: 16, lineHeight: 20 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  splitCol: { flex: 1, alignItems: 'center' },
  splitLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  splitAidant: { fontSize: 20, fontWeight: '700', color: '#28a745' },
  splitPlatform: { fontSize: 20, fontWeight: '700', color: Colors.light.primary },
  actions: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9ecef' },
  payButton: { backgroundColor: Colors.light.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  payButtonDisabled: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
