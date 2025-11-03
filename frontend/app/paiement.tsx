// app/paiement.tsx
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
import { Colors } from '@/constants/Colors';
import { STRIPE_CONFIG } from '../src/config/stripe';
import { PaymentData, PaymentService } from '../src/stripe/paymentService';
import { serviceManagement } from '../src/services/firebase/serviceManagement';

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

  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const initDoneRef = useRef(false);

  // Montants (affichage)
  const totalAmount = paymentData?.pricingData?.finalPrice ?? 0;
  const depositAmount = parseFloat((totalAmount * 0.2).toFixed(2));
  const finalAmount = parseFloat((totalAmount - depositAmount).toFixed(2));
  const currentAmount = depositAmount; // acompte à payer

  const handleCancel = useCallback(() => {
    Alert.alert('Annuler le paiement', 'Êtes-vous sûr de vouloir annuler ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  // 👇 IMPORTANT : on renvoie TOUT vers /conversation pour garder la tarification
  const navigateBackWithSuccess = useCallback(() => {
    const baseParams: Record<string, string> = {
      paymentSuccess: 'true',
      paymentType: 'deposit',
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
    if (!paymentData) return;
    setLoading(true);
    try {
      // Le service calcule lui-même 20% à partir du total
console.log('🔄 Début initialisation paiement...');
const result = await PaymentService.initializeDepositPayment(paymentData);
console.log('📥 Résultat initializeDepositPayment:', result);

if (result.success) {
  console.log('✅ Initialisation réussie, paymentIntentId:', result.paymentIntentId);
  if (result.paymentIntentId) {
    setPaymentIntentId(result.paymentIntentId);
    setPaymentReady(true);
    console.log('✅ Payment Sheet prêt !');
  } else {
    console.error('❌ Pas de paymentIntentId dans la réponse');
    Alert.alert('Erreur', "Réponse serveur incomplète (acompte)");
  }
} else {
  console.error('❌ Erreur initialisation:', result.error, 'Code:', result.errorCode);
  Alert.alert('Erreur de paiement', 'Impossible de traiter votre paiement. Veuillez réessayer.');
}
    } catch {
      Alert.alert('Erreur', 'Problème de connexion');
    } finally {
      setLoading(false);
    }
  }, [paymentData]);

  useEffect(() => {
    if (!paymentData) {
      Alert.alert('Erreur', 'Données manquantes', [{ text: 'Retour', onPress: () => router.back() }]);
      return;
    }
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      initializePayment();
    }
  }, [paymentData, initializePayment, router]);

  const handlePayment = async () => {
    if (!paymentReady || !paymentIntentId || !paymentData) {
      console.log('❌ Conditions non remplies:', { paymentReady, paymentIntentId: !!paymentIntentId, paymentData: !!paymentData });
      return;
    }
    
    console.log('🎯 Début handlePayment - tentative de présentation Payment Sheet');
    setLoading(true);
    try {
      console.log('📱 Appel de presentPaymentSheet...');
      const result = await PaymentService.presentPayment();
      console.log('📥 Résultat presentPaymentSheet:', result);
      
      if (result.success) {
        const confirmResult = await PaymentService.confirmPayment(paymentIntentId);
        if (confirmResult.success) {
          // Enregistrement (optionnel)
          await serviceManagement.createTransactionRecord({
            serviceId: paymentData.conversationId,
            clientId: paymentData.clientId,
            aidantId: paymentData.aidantId,
            montant: currentAmount,
            commission: 0,
            type: 'acompte',
          });

          Alert.alert(
            '✅ Paiement réussi !',
            `L'acompte de ${formatMontant(currentAmount)} a été prélevé.`,
            [{ text: 'Continuer', onPress: navigateBackWithSuccess }],
          );
        } else {
          Alert.alert('Paiement effectué', "Confirmation serveur indisponible.", [
            { text: 'OK', onPress: navigateBackWithSuccess },
          ]);
        }
      } else if (result.error) {
        console.error('❌ Erreur result.error:', result.error);
        Alert.alert('Erreur de paiement', 'Le paiement n\'a pas pu être finalisé. Veuillez réessayer.');
      } else {
        console.error('❌ Résultat inconnu:', result);
        Alert.alert('Erreur de paiement', 'Résultat inconnu');
      }
    } catch (error) {
      console.error('❌ Exception dans handlePayment:', error);
      Alert.alert('Erreur', 'Une erreur technique s\'est produite. Veuillez réessayer.');
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
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>💳 Acompte de réservation</Text>
            <Text style={styles.description}>
              Versez 20% du montant total pour confirmer votre réservation.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Récapitulatif</Text>
            <Row label="Coût total du service" value={formatMontant(totalAmount)} />
            <Row label="Solde restant après acompte" value={formatMontant(finalAmount)} />
            <Separator />
            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>ACOMPTE À PAYER</Text>
              <Text style={styles.currentAmount}>{formatMontant(currentAmount)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={loading}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payButton, (!paymentReady || loading) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!paymentReady || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>Payer {formatMontant(currentAmount)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2c3e50', textAlign: 'center' },
  description: { fontSize: 16, color: '#6c757d', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#6c757d' },
  rowValue: { fontSize: 14, color: '#2c3e50', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#e9ecef', marginVertical: 8 },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  currentLabel: { fontSize: 16, color: '#2c3e50', fontWeight: '600' },
  currentAmount: { fontSize: 20, color: Colors.light.primary, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    alignItems: 'center',
  },
  cancelButtonText: { color: '#6c757d', fontSize: 16, fontWeight: '600' },
  payButton: {
    flex: 2,
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: { backgroundColor: '#ccc' },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
