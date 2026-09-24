// app/conversation.tsx
// Conversation + parcours du service. L'étape affichée est dérivée de `conversation.status`
// (Firestore) : fermer l'app ou revenir plus tard ne fait rien perdre.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp, type DocumentData } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import { chatService, type Message, type StatutServiceType } from '@/src/services/firebase/chatService';
import { avisService } from '@/src/services/firebase/avisService';
import { PricingService, type PricingResult } from '@/src/utils/pricing';
import { calculatePaymentAmounts } from '@/src/stripe/paymentAmounts';
import ErrorService from '@/src/services/errorService';
import { ServiceStepper } from '@/components/conversation/ServiceStepper';
import type { ThemeColors } from '@/constants/themes';

const fmt = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

type Role = 'client' | 'aidant';

export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const flatListRef = useRef<FlatList<Message>>(null);

  // --- paramètres de navigation (stables pour toute la vie de l'écran)
  const rawParams = useLocalSearchParams();
  const getParam = (key: string): string => {
    const value = rawParams[key] || rawParams[`r_${key}`];
    return typeof value === 'string' ? value : '';
  };
  const stableParams = useRef({
    profileId: getParam('profileId'),
    profileName: getParam('profileName'),
    secteur: getParam('secteur'),
    jour: getParam('jour'),
    heureDebut: getParam('heureDebut'),
    heureFin: getParam('heureFin'),
    role: getParam('role') as Role | '',
  }).current;

  // --- état
  const [conversation, setConversation] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [adresseService, setAdresseService] = useState('');
  const [evaluation, setEvaluation] = useState(0);
  const [avisTexte, setAvisTexte] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showAcompteModal, setShowAcompteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConversationReady, setIsConversationReady] = useState(false);

  const conversationId =
    user && stableParams.profileId ? chatService.getConversationId(user.uid, stableParams.profileId) : null;

  // --- rôle et statut, dérivés du document Firestore (repli sur les paramètres pour l'historique)
  const status: StatutServiceType = (conversation?.status as StatutServiceType) ?? 'conversation';
  const isClient: boolean = conversation?.clientId
    ? conversation.clientId === user?.uid
    : stableParams.role !== 'aidant';

  // Détails du service : le document fait foi, les paramètres servent de repli.
  const details = useMemo(
    () => ({
      secteur: (conversation?.secteur as string) || stableParams.secteur,
      jour: (conversation?.jour as string) || stableParams.jour,
      heureDebut: (conversation?.heureDebut as string) || stableParams.heureDebut,
      heureFin: (conversation?.heureFin as string) || stableParams.heureFin,
      adresse: (conversation?.adresseService as string) || '',
    }),
    [conversation, stableParams]
  );

  // --- tarification
  const pricing: PricingResult | null = useMemo(() => {
    if (!details.heureDebut || !details.heureFin) return null;
    return PricingService.calculatePriceFromTimeRangeSafe(details.heureDebut, details.heureFin, 1);
  }, [details.heureDebut, details.heureFin]);
  const pricingError = pricing?.error ?? null;
  const total = pricing && !pricing.error ? pricing.finalPrice : 0;
  const amounts = total > 0 ? calculatePaymentAmounts(total, 'deposit') : null;

  // --- créer/rejoindre la conversation
  useEffect(() => {
    if (!conversationId || !user || !stableParams.profileId) return;
    const setup = async () => {
      try {
        await chatService.ensureConversationExists(
          conversationId,
          [user.uid, stableParams.profileId],
          {
            [user.uid]: { displayName: user.displayName || 'Vous' },
            [stableParams.profileId]: { displayName: stableParams.profileName || 'Aidant' },
          },
          stableParams.role === 'client' ? { clientId: user.uid, aidantId: stableParams.profileId } : undefined
        );
        setIsConversationReady(true);
      } catch (error: any) {
        ErrorService.logError('CONVERSATION_SETUP', error?.message ?? 'setup failed', conversationId, 'error');
        toast.error('Impossible de charger la conversation. Vérifiez votre connexion.');
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user, stableParams.profileId, stableParams.profileName, stableParams.role]);

  // --- écoute du document et des messages
  useEffect(() => {
    if (!conversationId || !isConversationReady) return;
    const unsubConv = chatService.listenToConversation(conversationId, setConversation);
    const unsubMsgs = chatService.listenToMessages(conversationId, setMessages);
    return () => {
      unsubConv?.();
      unsubMsgs?.();
    };
  }, [conversationId, isConversationReady]);

  // Adresse saisie : pré-remplir depuis le document
  useEffect(() => {
    if (details.adresse && !adresseService) setAdresseService(details.adresse);
  }, [details.adresse, adresseService]);

  // --- retour de paiement (acompte / solde) : on persiste le statut, une seule fois
  const paymentHandledRef = useRef(false);
  useEffect(() => {
    if (paymentHandledRef.current || !conversationId || !isConversationReady) return;
    if (String(rawParams.paymentSuccess || '') !== 'true') return;
    paymentHandledRef.current = true;

    const paymentType = String(rawParams.paymentType || '');
    const returnedAdresse = getParam('adresse');

    if (paymentType === 'deposit') {
      chatService
        .updateConversationMetadata(conversationId, {
          status: 'acompte_paye' as StatutServiceType,
          ...(returnedAdresse ? { adresseService: returnedAdresse } : {}),
        })
        .catch((e: any) => ErrorService.logError('STATUS_UPDATE', e?.message, 'deposit', 'error'));
    } else if (paymentType === 'final') {
      chatService
        .updateConversationMetadata(conversationId, { status: 'termine' as StatutServiceType, completedAt: new Date() })
        .catch((e: any) => ErrorService.logError('STATUS_UPDATE', e?.message, 'final', 'error'));
      // Le panneau « Service terminé » (avec « Voir mes services ») s'affiche dès que le statut change.
      toast.success('Le solde a été réglé. Merci pour votre confiance !', 'Service terminé');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isConversationReady, rawParams.paymentSuccess, rawParams.paymentType]);

  // ----------------------------- utils -----------------------------
  const formatHeure = (ts: any) => {
    try {
      if (!ts) return '';
      const date: Date = ts instanceof Timestamp ? ts.toDate() : typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
      if (Number.isNaN(date.getTime())) return '';
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // ----------------------------- actions -----------------------------
  const envoyerMessage = async () => {
    if (!user || !conversationId || !isConversationReady) return;
    const texte = nouveauMessage.trim();
    if (!texte) return;
    try {
      setLoading(true);
      await chatService.sendMessage(conversationId, { texte, expediteurId: user.uid });
      setNouveauMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: any) {
      ErrorService.logError('SEND_MESSAGE', e?.message, conversationId, 'error');
      toast.error("Le message n'a pas pu être envoyé.");
    } finally {
      setLoading(false);
    }
  };

  const retournerEnArriere = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const ouvrirConfirmation = () => {
    if (pricingError || !pricing) return;
    setShowConfirmationModal(true);
  };

  const confirmerService = () => {
    if (adresseService.trim() === '') {
      toast.info("Indiquez l'adresse où le service doit être réalisé.", 'Adresse requise');
      return;
    }
    setShowConfirmationModal(false);
    setShowAcompteModal(true);
  };

  const payerAcompte = async () => {
    if (!conversationId || !pricing || !user || !amounts) return;
    setLoading(true);
    setShowAcompteModal(false);
    try {
      await chatService.updateConversationMetadata(conversationId, {
        adresseService: adresseService.trim(),
        status: 'acompte_en_cours' as StatutServiceType,
        secteur: details.secteur,
        jour: details.jour,
        heureDebut: details.heureDebut,
        heureFin: details.heureFin,
      });

      const paymentData = {
        conversationId,
        aidantId: stableParams.profileId,
        clientId: user.uid,
        pricingData: { ...pricing },
        serviceDetails: { ...details, adresse: adresseService.trim() },
        isDeposit: true,
      };
      router.push({
        pathname: '/paiement',
        params: {
          paymentData: JSON.stringify(paymentData),
          paymentType: 'deposit',
          r_profileId: stableParams.profileId,
          r_profileName: stableParams.profileName,
          r_secteur: details.secteur,
          r_jour: details.jour,
          r_heureDebut: details.heureDebut,
          r_heureFin: details.heureFin,
          r_adresse: adresseService.trim(),
          r_role: 'client',
        },
      });
    } catch (e: any) {
      ErrorService.logError('NAV_PAYMENT', e?.message, conversationId, 'error');
      toast.error("Impossible d'accéder au paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const terminerService = () => {
    if (!conversationId) return;
    Alert.alert('Service réalisé ?', 'Confirmez que le service a bien eu lieu pour passer à l’évaluation.', [
      { text: 'Pas encore', style: 'cancel' },
      {
        text: 'Oui, terminé',
        onPress: () =>
          chatService
            .updateConversationStatus(conversationId, 'evaluation')
            .catch((e: any) => ErrorService.logError('STATUS_UPDATE', e?.message, 'evaluation', 'error')),
      },
    ]);
  };

  const avisObligatoire = evaluation > 0 && evaluation < 3;

  const envoyerAvisEtPayer = async () => {
    if (evaluation === 0) {
      toast.info('Choisissez une note de 1 à 5 étoiles.', 'Votre note');
      return;
    }
    if (avisObligatoire && avisTexte.trim() === '') {
      toast.info('Pour une note inférieure à 3 étoiles, merci de nous expliquer ce qui n’a pas convenu.', 'Un mot de plus');
      return;
    }
    if (!user || !conversationId || !stableParams.profileId) {
      naviguerVersPaiementFinal();
      return;
    }
    try {
      setLoading(true);
      await avisService.createAvis({
        aidantId: stableParams.profileId,
        clientId: user.uid,
        conversationId,
        rating: evaluation,
        comment: avisTexte.trim() || 'Service satisfaisant.',
        serviceDate: details.jour || new Date().toISOString().split('T')[0],
        secteur: details.secteur || '',
        dureeService: pricing?.hours ?? 0,
        montantService: total,
        clientName: user.displayName || 'Client anonyme',
      });
    } catch (e: any) {
      ErrorService.logError('SAVE_AVIS', e?.message, conversationId, 'warning');
      toast.warning('Nous n’avons pas pu sauvegarder votre avis, le règlement du solde continue.', 'Avis non enregistré');
    } finally {
      setLoading(false);
      naviguerVersPaiementFinal();
    }
  };

  const naviguerVersPaiementFinal = () => {
    if (!conversationId || !user || !pricing) return;
    // Pour l'écran paiement-final, `finalPrice` doit être le SOLDE à payer maintenant.
    const paymentData = {
      conversationId,
      aidantId: stableParams.profileId,
      clientId: user.uid,
      pricingData: { ...pricing, finalPrice: amounts?.finalAmountEur ?? 0 },
      serviceDetails: details,
      isDeposit: false,
    };
    router.push({
      pathname: '/paiement-final',
      params: {
        paymentData: JSON.stringify(paymentData),
        paymentType: 'final',
        r_profileId: stableParams.profileId,
        r_profileName: stableParams.profileName,
        r_secteur: details.secteur,
        r_jour: details.jour,
        r_heureDebut: details.heureDebut,
        r_heureFin: details.heureFin,
        r_adresse: details.adresse,
        r_role: 'client',
      },
    });
  };

  // ----------------------------- rendu -----------------------------
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const mine = item.expediteurId === user?.uid;
      return (
        <View style={[styles.messageContainer, mine ? styles.messageMine : styles.messageTheirs]}>
          <Text style={[styles.messageTexte, mine && styles.messageTexteMine]}>{item.texte}</Text>
          <Text style={[styles.messageHeure, mine && styles.messageHeureMine]}>{formatHeure(item.createdAt ?? item.timestamp)}</Text>
        </View>
      );
    },
    [user?.uid, styles]
  );

  const renderEtoiles = () => (
    <View style={styles.etoilesContainer}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => setEvaluation(n)}
          style={styles.etoileButton}
          accessibilityRole="button"
          accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}
          accessibilityState={{ selected: n <= evaluation }}
        >
          <Ionicons name={n <= evaluation ? 'star' : 'star-outline'} size={40} color={n <= evaluation ? '#f5b301' : theme.border} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const InfoLine = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  );

  /** Panneau d'action sous le fil de discussion, selon le statut et le rôle. */
  const renderPanel = () => {
    // ---- Aidant : lecture seule
    if (!isClient) {
      const msg: Record<StatutServiceType, string> = {
        conversation: "Le client n'a pas encore confirmé le service.",
        service_confirme: "Le client n'a pas encore confirmé le service.",
        acompte_en_cours: "Le client finalise le paiement de l'acompte.",
        acompte_paye: 'Service confirmé — acompte reçu.',
        en_cours: 'Service en cours.',
        evaluation: 'Le client évalue le service.',
        termine: 'Service terminé et réglé.',
      };
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{msg[status]}</Text>
          {details.jour ? <InfoLine icon="calendar-outline" text={`${details.jour} · ${details.heureDebut} → ${details.heureFin}`} /> : null}
          {details.adresse && (status === 'acompte_paye' || status === 'en_cours') ? (
            <InfoLine icon="location-outline" text={details.adresse} />
          ) : null}
        </View>
      );
    }

    // ---- Client
    switch (status) {
      case 'conversation':
      case 'service_confirme':
      case 'acompte_en_cours':
        if (pricingError || !pricing) {
          return (
            <View style={[styles.panel, styles.panelWarning]}>
              <Text style={styles.panelTitle}>Créneau invalide</Text>
              <Text style={styles.panelText}>{pricingError ?? 'Horaires manquants.'} Relancez une recherche avec un créneau d’au moins 2 heures.</Text>
            </View>
          );
        }
        return (
          <View style={styles.panel}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{pricing.hours} h · {details.secteur}</Text>
              <Text style={styles.priceValue}>{fmt(total)}</Text>
            </View>
            {pricing.discount > 0 ? (
              <Text style={styles.priceHint}>au lieu de {fmt(pricing.basePrice)} — vous économisez {fmt(pricing.discount)}</Text>
            ) : null}
            {amounts ? (
              <Text style={styles.priceHint}>
                Acompte aujourd&apos;hui : {fmt(amounts.depositAmountEur)} · Solde après le service : {fmt(amounts.finalAmountEur)}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={ouvrirConfirmation} accessibilityRole="button">
              <Ionicons name={status === 'acompte_en_cours' ? 'card-outline' : 'checkmark-circle-outline'} size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {status === 'acompte_en_cours' ? "Reprendre le paiement de l'acompte" : 'Confirmer le service'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'acompte_paye':
      case 'en_cours':
        return (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Service confirmé</Text>
            <InfoLine icon="calendar-outline" text={`${details.jour} · ${details.heureDebut} → ${details.heureFin}`} />
            {details.adresse ? <InfoLine icon="location-outline" text={details.adresse} /> : null}
            {amounts ? <InfoLine icon="card-outline" text={`Acompte versé : ${fmt(amounts.depositAmountEur)} · reste ${fmt(amounts.finalAmountEur)}`} /> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={terminerService} accessibilityRole="button">
              <Ionicons name="flag-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Le service est terminé</Text>
            </TouchableOpacity>
            <Text style={styles.panelHint}>À faire une fois le service réalisé : vous passerez à l’évaluation puis au règlement du solde.</Text>
          </View>
        );

      case 'evaluation':
        return (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Comment s&apos;est passé le service avec {stableParams.profileName} ?</Text>
            {renderEtoiles()}
            <TextInput
              style={styles.avisInput}
              value={avisTexte}
              onChangeText={setAvisTexte}
              placeholder={avisObligatoire ? 'Dites-nous ce qui n’a pas convenu (obligatoire)' : 'Un mot sur le service (facultatif)'}
              placeholderTextColor={theme.textTertiary}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={envoyerAvisEtPayer}
              disabled={loading}
              accessibilityRole="button"
            >
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {loading ? 'Envoi…' : amounts ? `Envoyer et régler le solde (${fmt(amounts.finalAmountEur)})` : 'Envoyer'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'termine':
        return (
          <View style={styles.panel}>
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-done-circle" size={28} color={theme.success} />
              <Text style={styles.panelTitle}>Service terminé et réglé</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/services')} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Voir mes services</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={retournerEnArriere} style={styles.backButton} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{stableParams.profileName || 'Conversation'}</Text>
          {details.secteur || details.jour ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {[details.secteur, details.jour, details.heureDebut && details.heureFin ? `${details.heureDebut} → ${details.heureFin}` : ''].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>
      <ServiceStepper status={status} />

      {!isConversationReady ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Chargement de la conversation…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isClient ? 'Présentez votre besoin à ' + (stableParams.profileName || 'l’aidant') + ', puis confirmez le service ci-dessous.' : 'Aucun message pour le moment.'}
              </Text>
            }
          />

          {renderPanel()}

          {status !== 'termine' ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={nouveauMessage}
                onChangeText={setNouveauMessage}
                placeholder="Votre message…"
                placeholderTextColor={theme.textTertiary}
                multiline
                maxLength={500}
                accessibilityLabel="Message"
              />
              <TouchableOpacity
                onPress={envoyerMessage}
                style={[styles.sendButton, (!nouveauMessage.trim() || loading) && styles.buttonDisabled]}
                disabled={!nouveauMessage.trim() || loading}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le message"
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}

      {/* Modale : adresse + récapitulatif */}
      <Modal visible={showConfirmationModal} transparent animationType="slide" onRequestClose={() => setShowConfirmationModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirmer le service</Text>
              {pricing && !pricing.error ? (
                <View style={styles.modalPricing}>
                  <View style={styles.modalRow}><Text style={styles.modalLabel}>Durée</Text><Text style={styles.modalValue}>{pricing.hours} h</Text></View>
                  {pricing.discount > 0 ? (
                    <View style={styles.modalRow}><Text style={styles.modalLabel}>Prix normal</Text><Text style={[styles.modalValue, styles.barre]}>{fmt(pricing.basePrice)}</Text></View>
                  ) : null}
                  <View style={[styles.modalRow, styles.modalTotalRow]}><Text style={styles.modalTotalLabel}>Total</Text><Text style={styles.modalTotalValue}>{fmt(total)}</Text></View>
                </View>
              ) : null}
              <Text style={styles.modalDescription}>Adresse où le service doit être réalisé :</Text>
              <TextInput
                style={styles.adresseInput}
                value={adresseService}
                onChangeText={setAdresseService}
                placeholder="12 rue du Général de Gaulle, 97400 Saint-Denis"
                placeholderTextColor={theme.textTertiary}
                multiline
                accessibilityLabel="Adresse du service"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmationModal(false)} accessibilityRole="button">
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmerService} accessibilityRole="button">
                  <Text style={styles.modalConfirmText}>Continuer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modale : acompte */}
      <Modal visible={showAcompteModal} transparent animationType="slide" onRequestClose={() => setShowAcompteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Acompte de confirmation</Text>
            {amounts ? (
              <View style={styles.modalPricing}>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Montant total</Text><Text style={styles.modalValue}>{fmt(amounts.totalAmountEur)}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Acompte (20 %)</Text><Text style={styles.modalTotalValue}>{fmt(amounts.depositAmountEur)}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Solde après le service</Text><Text style={styles.modalValue}>{fmt(amounts.finalAmountEur)}</Text></View>
              </View>
            ) : null}
            <Text style={styles.modalDescription}>L&apos;acompte confirme votre réservation et sera déduit du montant total.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcompteModal(false)} accessibilityRole="button">
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmButton, loading && styles.buttonDisabled]} onPress={payerAcompte} disabled={loading} accessibilityRole="button">
                <Text style={styles.modalConfirmText}>{loading ? 'Paiement…' : amounts ? `Payer ${fmt(amounts.depositAmountEur)}` : 'Payer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    headerSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.textSecondary },
    messagesList: { flex: 1 },
    messagesContent: { paddingHorizontal: 15, paddingVertical: 10, flexGrow: 1 },
    emptyText: { textAlign: 'center', color: theme.textTertiary, fontSize: 14, marginTop: 24, paddingHorizontal: 20, lineHeight: 20 },
    messageContainer: { padding: 12, marginVertical: 4, borderRadius: 18, maxWidth: '80%' },
    messageMine: { alignSelf: 'flex-end', backgroundColor: theme.primary },
    messageTheirs: { alignSelf: 'flex-start', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    messageTexte: { fontSize: 16, lineHeight: 22, color: theme.text },
    messageTexteMine: { color: '#ffffff' },
    messageHeure: { fontSize: 11, color: theme.textTertiary, marginTop: 4, textAlign: 'right' },
    messageHeureMine: { color: 'rgba(255,255,255,0.75)' },

    panel: {
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: 16,
      gap: 10,
    },
    panelWarning: { borderTopColor: theme.warning },
    panelTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    panelText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    panelHint: { fontSize: 12, color: theme.textTertiary, lineHeight: 17 },
    infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLineText: { fontSize: 14, color: theme.textSecondary, flex: 1 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 15, color: theme.text, fontWeight: '600', flex: 1, marginRight: 8 },
    priceValue: { fontSize: 20, color: theme.primary, fontWeight: 'bold' },
    priceHint: { fontSize: 13, color: theme.textSecondary },
    doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    primaryButton: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 14,
      minHeight: 50,
      marginTop: 4,
    },
    primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', flexShrink: 1, textAlign: 'center' },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      paddingVertical: 14,
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    secondaryButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },

    etoilesContainer: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
    etoileButton: { padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    avisInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: theme.text,
      minHeight: 80,
      textAlignVertical: 'top',
    },

    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    messageInput: {
      flex: 1,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.text,
      maxHeight: 120,
      minHeight: 44,
    },
    sendButton: { backgroundColor: theme.primary, borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalScroll: { flexGrow: 1, justifyContent: 'center', width: '100%' },
    modalContent: { backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 420, alignSelf: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 14, textAlign: 'center' },
    modalPricing: { backgroundColor: theme.background, padding: 14, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: theme.border, gap: 8 },
    modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalLabel: { fontSize: 14, color: theme.textSecondary },
    modalValue: { fontSize: 14, fontWeight: '500', color: theme.text },
    barre: { textDecorationLine: 'line-through', color: theme.textTertiary },
    modalTotalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border },
    modalTotalLabel: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    modalTotalValue: { fontSize: 16, fontWeight: 'bold', color: theme.primary },
    modalDescription: { fontSize: 15, color: theme.textSecondary, marginBottom: 12, lineHeight: 22 },
    adresseInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: theme.text,
      marginBottom: 16,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalCancelButton: { flex: 1, borderRadius: 10, paddingVertical: 14, minHeight: 48, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    modalConfirmButton: { flex: 1, borderRadius: 10, paddingVertical: 14, minHeight: 48, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { color: theme.textSecondary, fontSize: 16, fontWeight: '500' },
    modalConfirmText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  });
