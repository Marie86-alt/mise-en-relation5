// app/paiement.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { PaymentData, PaymentService } from '../src/stripe/paymentService';
import { serviceManagement } from '../src/services/firebase/serviceManagement';

// Format montant
const formatMontant = (montant: number): string => `${montant.toFixed(2)}€`;

export default function PaiementScreen() {
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

  // 👉 Séparation des loaders pour meilleure UX
  const [paymentInitializing, setPaymentInitializing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const initDoneRef = useRef(false);

  // Montants
  const totalAmount = paymentData?.pricingData?.finalPrice ?? 0;
  const depositAmount = parseFloat((totalAmount * 0.2).toFixed(2));
  const finalAmount = totalAmount - depositAmount;
  const currentAmount = depositAmount;

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Annuler le paiement',
      'Souhaites-tu annuler et revenir à la page précédente ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }, [router]);

  // Navigation après paiement OK
  const navigateBackWithSuccess = useCallback(() => {
    router.replace({
      pathname: '/conversation',
      params: {
        paymentSuccess: 'true',
        paymentType: 'deposit',
        profileId: String(params.r_profileId || ''),
        profileName: String(params.r_profileName || ''),
        secteur: String(params.r_secteur || ''),
        jour: String(params.r_jour || ''),
        heureDebut: String(params.r_heureDebut || ''),
        heureFin: String(params.r_heureFin || ''),
        adresse: String(params.r_adresse || ''),
      },
    });
  }, [params, router]);

  // 👉 Optimisation : initialisation Stripe sans bloquer l'écran
  const initializePayment = useCallback(async () => {
    if (!paymentData) return;

    setPaymentInitializing(true);

    try {
      console.log('🔄 Initialisation paiement...');
      const result = await PaymentService.initializeDepositPayment(paymentData);

      if (result.success && result.paymentIntentId) {
        setPaymentIntentId(result.paymentIntentId);
        setPaymentReady(true);
        console.log('✅ Payment sheet prête');
      } else {
        Alert.alert(
          'Erreur',
          "Impossible d'initialiser le paiement. Réessaie dans quelques instants."
        );
      }
    } catch{
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setPaymentInitializing(false);
    }
  }, [paymentData]);

  useEffect(() => {
    if (!paymentData) {
      Alert.alert('Erreur', 'Impossible de charger les données.', [
        { text: 'Retour', onPress: () => router.back() },
      ]);
      return;
    }

    if (!initDoneRef.current) {
      initDoneRef.current = true;
      initializePayment();
    }
  }, [paymentData, initializePayment, router]);

  // 👉 Paiement
  const handlePayment = async () => {
    if (!paymentReady || !paymentIntentId || !paymentData) return;

    setPaymentLoading(true);

    try {
      const rawResult = await PaymentService.presentPayment();
      const result = rawResult as {
        success: boolean;
        error?: string | { message?: string };
      };

      // Paiement annulé
      if (
        result.error &&
        (
          result.error === 'Canceled' ||
          result.error === 'Paiement annulé' ||
          (typeof result.error === 'object' &&
            'message' in result.error &&
            result.error.message?.includes('Canceled'))
        )
      ) {
        Alert.alert('Paiement annulé', 'Tu peux réessayer quand tu veux 🙂');
        return;
      }

      // Erreur Stripe
      if (result.error) {
        Alert.alert(
          'Oops 😕',
          'Une erreur est survenue pendant le paiement. Réessaie dans quelques instants.'
        );
        return;
      }

      // Paiement validé
      if (result.success) {
        const confirm = await PaymentService.confirmPayment(paymentIntentId);

        if (confirm.success) {
          await serviceManagement.createTransactionRecord({
            serviceId: paymentData.conversationId,
            clientId: paymentData.clientId,
            aidantId: paymentData.aidantId,
            montant: currentAmount,
            commission: 0,
            type: 'acompte',
          });

          Alert.alert(
            '🎉 Paiement confirmé !',
            `Ton acompte de ${formatMontant(currentAmount)} a bien été enregistré.`,
            [{ text: 'Continuer', onPress: navigateBackWithSuccess }]
          );
        } else {
          Alert.alert('Paiement ok', 'Confirmation serveur indisponible.');
        }
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de finaliser le paiement.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!paymentData) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>

        <View style={styles.header}>
          <Text style={styles.title}>💳 Acompte de réservation</Text>
          <Text style={styles.description}>
            Verse 20% pour confirmer ta réservation.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Récapitulatif</Text>

          <Row label="Coût total du service" value={formatMontant(totalAmount)} />
          <Row label="Solde restant" value={formatMontant(finalAmount)} />

          <Separator />

          {/* Barre graphique */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(depositAmount / totalAmount) * 100}%` },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {formatMontant(depositAmount)} versés sur {formatMontant(totalAmount)}
            </Text>
          </View>

          <View style={styles.currentRow}>
            <Text style={styles.currentLabel}>ACOMPTE À PAYER</Text>
            <Text style={styles.currentAmount}>{formatMontant(currentAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* === BOUTONS === */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePayment}
          disabled={!paymentReady || paymentLoading}
          style={[
            styles.payButton,
            (!paymentReady || paymentLoading) && styles.payButtonDisabled,
          ]}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              Payer {formatMontant(currentAmount)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loader plein écran uniquement pendant le paiement */}
      {(paymentLoading || paymentInitializing) && (
        <FullScreenLoader message="Paiement en cours..." />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label} :</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 16 },

  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#2c3e50' },
  description: { fontSize: 15, textAlign: 'center', marginTop: 8, color: '#6c757d' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: '#6c757d', fontSize: 14 },
  rowValue: { color: '#2c3e50', fontWeight: '600', fontSize: 14 },

  separator: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },

  progressContainer: { marginTop: 10, alignItems: 'center' },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#dfe6ee',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  progressText: { fontSize: 12, color: '#6c757d' },

  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 12,
  },
  currentLabel: { fontWeight: '700', fontSize: 16, color: '#2c3e50' },
  currentAmount: { fontSize: 20, fontWeight: '700', color: Colors.light.primary },

  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderColor: '#6c757d',
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#555', fontWeight: '600' },

  payButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
  },
  payButtonDisabled: {
    backgroundColor: '#9bbbd4',
    opacity: 0.6,
  },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
