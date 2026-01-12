// app/conversation.tsx
import React, { useEffect, useRef, useState, useMemo} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView,
  Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService, Message } from '../src/services/firebase/chatService';
import { Colors } from '@/constants/Colors';
import { Timestamp } from 'firebase/firestore';
import { PricingService, PricingResult } from '../src/utils/pricing';
import { avisService } from '../src/services/firebase/avisService';
import { useTheme } from '@/hooks/useTheme';

type EtapeType = 'conversation' | 'attente_service' | 'evaluation' | 'avis_obligatoire';
const ETAPES: Record<string, EtapeType> = {
  CONVERSATION: 'conversation',
  ATTENTE_SERVICE: 'attente_service',
  EVALUATION: 'evaluation',
  AVIS_OBLIGATOIRE: 'avis_obligatoire',
};

// --- helpers ---
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => `${n.toFixed(2)}€`;

export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList<Message>>(null);

  // --- params stables (depuis la navigation)
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
  }).current;

  // --- états
  const [etapeActuelle, setEtapeActuelle] = useState<EtapeType>(ETAPES.CONVERSATION);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState<string>('');
  const [adresseService, setAdresseService] = useState<string>('');
  const [evaluation, setEvaluation] = useState<number>(0);
  const [avisTexte, setAvisTexte] = useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [showAcompteModal, setShowAcompteModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pricingData, setPricingData] = useState<PricingResult | null>(null);
  const [isConversationReady, setIsConversationReady] = useState<boolean>(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const conversationId =
    user && stableParams.profileId
      ? chatService.getConversationId(user.uid, stableParams.profileId)
      : null;

  // --- tarification initiale (si on a les heures dans les params)
  useEffect(() => {
    if (stableParams.heureDebut && stableParams.heureFin) {
      const { heureDebut, heureFin } = stableParams;
      const result = PricingService.calculatePriceFromTimeRangeSafe(heureDebut, heureFin, 1);

      if (result.error) {
        // Gestion de l'erreur sans exception - affichage dans l'interface
        console.log('🔍 Erreur pricing détectée:', result.error);
        setPricingError(result.error || 'Erreur de calcul de prix');
        setPricingData(null);
      } else {
        // Succès
        console.log('✅ Pricing calculé avec succès');
        setPricingData(result);
        setPricingError(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- s’assurer que la conversation existe avant d’écouter les messages
  useEffect(() => {
    if (!conversationId || !user || !stableParams.profileId) return;
    const setupConversation = async () => {
      try {
        await chatService.ensureConversationExists(
          conversationId,
          [user.uid, stableParams.profileId],
          {
            [user.uid]: { displayName: user.displayName || 'Vous' },
            [stableParams.profileId]: { displayName: stableParams.profileName || 'Aidant' },
          }
        );
        setIsConversationReady(true);
      } catch (error) {
        console.log("❌ Échec de la configuration de la conversation", error);
        Alert.alert("Erreur", "Impossible de charger la conversation.");
      }
    };
    setupConversation();
  }, [conversationId, user, stableParams.profileId, stableParams.profileName]);

  // --- écoute des messages quand prêt
  useEffect(() => {
    if (!conversationId || !isConversationReady) return;
    const unsubscribe = chatService.listenToMessages(conversationId, setMessages);
    return () => unsubscribe?.();
  }, [conversationId, isConversationReady]);

  // --- retour de paiement (acompte / final)
  useEffect(() => {
    const paymentSuccess = String(rawParams.paymentSuccess || '');
    const paymentType = String(rawParams.paymentType || '');
    
    if (paymentSuccess === 'true') {
      const returnedAdresse = rawParams.adresse || rawParams.r_adresse;
      if (typeof returnedAdresse === 'string' && returnedAdresse) setAdresseService(returnedAdresse as string);
      
      if (paymentType === 'deposit') {
        setEtapeActuelle(ETAPES.ATTENTE_SERVICE);
        if (conversationId && chatService.updateConversationStatus) {
          chatService.updateConversationStatus(conversationId, 'acompte_paye');
        }
      } else if (paymentType === 'final') {
        Alert.alert(
          '✅ Service terminé !', 
          'Le paiement a été effectué avec succès. Merci d\'avoir utilisé notre plateforme !',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      }
    }
  }, [rawParams.paymentSuccess, rawParams.paymentType, rawParams.adresse, rawParams.r_adresse, conversationId, router]);

  // ----------------------------- utils -----------------------------
  const formatHeure = (ts: any) => {
    try {
      let date: Date;
      if (!ts) return '';
      if (ts instanceof Timestamp) date = ts.toDate();
      else if (typeof ts?.toDate === 'function') date = ts.toDate();
      else if (typeof ts === 'number') date = new Date(ts);
      else return '';
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    } catch { return ''; }
  };

  const getAcompteAmount = () => {
    if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
    return round2(pricingData.finalPrice * 0.20);
  };

  const getMontantRestant = () => {
    if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
    return round2(pricingData.finalPrice - getAcompteAmount());
  };

  // commission 40/60 (affichage informatif)
  const getCommissionPlateforme = () => {
    if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
    return round2(pricingData.finalPrice * 0.40);
  };

  const getMontantAidant = () => {
    if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
    return round2(pricingData.finalPrice * 0.60);
  };

  // ----------------------------- actions -----------------------------
  const envoyerMessage = async () => {
    if (!user || !conversationId || !isConversationReady) return;
    const texte = (nouveauMessage || '').trim();
    if (!texte) return;
    try {
      setLoading(true);
      await chatService.sendMessage(conversationId, { texte, expediteurId: user.uid });
      setNouveauMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      console.log('Erreur envoi message', e);
      Alert.alert('Erreur', "Le message n'a pas pu être envoyé.");
    } finally {
      setLoading(false);
    }
  };

  const retournerEnArriere = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Retour vers la page de recherche (onglet principal)
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.log('Erreur navigation retour:', error);
      // Fallback vers l'accueil
      router.replace('/(tabs)');
    }
  };

  const confirmerService = () => {
    if (adresseService.trim() === '') {
      Alert.alert('Erreur', 'Veuillez saisir l\'adresse.');
      return;
    }
    setShowConfirmationModal(false);
    setShowAcompteModal(true);
  };

  const payerAcompte = async () => {
    if (!conversationId || !pricingData || !user) return;
    setLoading(true);
    setShowAcompteModal(false);
    try {
      const paymentData = {
        conversationId,
        aidantId: stableParams.profileId,
        clientId: user.uid,
        pricingData: { ...pricingData }, // ← objet complet attendu par TS
        serviceDetails: {
          secteur: stableParams.secteur,
          jour: stableParams.jour,
          heureDebut: stableParams.heureDebut,
          heureFin: stableParams.heureFin,
          adresse: adresseService,
        },
        isDeposit: true,
      };
      
      await chatService.updateConversationMetadata(conversationId, {
        adresseService,
        status: 'acompte_en_cours',
        // on persiste aussi le contexte pour futurs écrans/listes
        secteur: stableParams.secteur,
        jour: stableParams.jour,
        heureDebut: stableParams.heureDebut,
        heureFin: stableParams.heureFin,
      });
      
      router.push({
        pathname: '/paiement',
        params: {
          paymentData: JSON.stringify(paymentData),
          paymentType: 'deposit',
          r_profileId: stableParams.profileId,
          r_profileName: stableParams.profileName,
          r_secteur: stableParams.secteur,
          r_jour: stableParams.jour,
          r_heureDebut: stableParams.heureDebut,
          r_heureFin: stableParams.heureFin,
          r_adresse: adresseService,
        },
      });
    } catch (e) {
      console.log('Erreur navigation paiement:', e);
      Alert.alert('Erreur', 'Impossible d\'accéder au paiement');
      setLoading(false);
    }
  };

  const terminerService = () => {
    setEtapeActuelle(ETAPES.EVALUATION);
  };

  const confirmerEvaluation = async () => {
    if (evaluation === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note de 1 à 5 étoiles.');
      return;
    }
    if (evaluation < 3) {
      setEtapeActuelle(ETAPES.AVIS_OBLIGATOIRE);
    } else {
      await sauvegarderAvis('Service satisfaisant.');
    }
  };

  const confirmerAvis = async () => {
    if (avisTexte.trim() === '') {
      Alert.alert('Erreur', 'Un avis détaillé est obligatoire pour une note < 3 étoiles.');
      return;
    }
    await sauvegarderAvis(avisTexte.trim());
  };

  const sauvegarderAvis = async (commentaire: string) => {
    // log utile pour debug
    console.log('🔍 Params:', {
      userId: user?.uid,
      profileId: stableParams.profileId,
      conversationId,
      evaluation,
      commentaire
    });

    if (!user || !conversationId || !stableParams.profileId) {
      naviguerVersPaiement();
      return;
    }

    try {
      setLoading(true);

      // si pas de pricingData (cas rare), on tente un fallback depuis les heures
      let pricingForReview = pricingData;
      if (!pricingForReview && stableParams.heureDebut && stableParams.heureFin) {
        try {
          pricingForReview = PricingService.calculatePriceFromTimeRangeSafe(
            stableParams.heureDebut,
            stableParams.heureFin,
            1
          );
          setPricingData(pricingForReview);
        } catch {}
      }

      await avisService.createAvis({
        aidantId: stableParams.profileId,
        clientId: user.uid,
        conversationId,
        rating: evaluation,
        comment: commentaire,
        serviceDate: String(stableParams.jour || new Date().toISOString().split('T')[0]),
        secteur: String(stableParams.secteur || ''),
        dureeService: pricingForReview?.hours ?? 0,
        montantService: pricingForReview?.finalPrice ?? 0,
        clientName: user.displayName || 'Client anonyme',
      });
    } catch (error) {
      console.log('❌ Erreur sauvegarde avis:', error);
      Alert.alert('Info', 'Avis non sauvegardé, le paiement va continuer.');
    } finally {
      setLoading(false);
      naviguerVersPaiement();
    }
  };

  const naviguerVersPaiement = () => {
    if (!conversationId || !user) return;

    // si on n'a pas de tarification, on tente un calcul simple
    let pricing = pricingData;
    if (!pricing && stableParams.heureDebut && stableParams.heureFin) {
      try {
        pricing = PricingService.calculatePriceFromTimeRangeSafe(
          stableParams.heureDebut,
          stableParams.heureFin,
          1
        );
        setPricingData(pricing);
      } catch {}
    }

    const total = pricing ? round2(pricing.finalPrice) : 0;
    const solde = pricing ? round2(total - round2(total * 0.2)) : 0;

    const paymentData = {
      conversationId,
      aidantId: stableParams.profileId,
      clientId: user.uid,
      // ⚠️ pour l'écran "paiement-final", `finalPrice` doit être le SOLDE (80%) à payer maintenant
      pricingData: pricing
        ? { ...pricing, finalPrice: solde }
        : {
            basePrice: total,
            finalPrice: solde,
            discount: 0,
            hours: 0,
            discountPercentage: 0,
            hourlyRate: 0,
          } as PricingResult,
      serviceDetails: {
        secteur: stableParams.secteur,
        jour: stableParams.jour,
        heureDebut: stableParams.heureDebut,
        heureFin: stableParams.heureFin,
        adresse: adresseService,
      },
      isDeposit: false,
    };

    router.push({
      pathname: '/paiement-final',
      params: {
        paymentData: JSON.stringify(paymentData),
        paymentType: 'final',
        r_profileId: stableParams.profileId,
        r_profileName: stableParams.profileName,
        r_secteur: stableParams.secteur,
        r_jour: stableParams.jour,
        r_heureDebut: stableParams.heureDebut,
        r_heureFin: stableParams.heureFin,
        r_adresse: adresseService,
      },
    });
  };

  // ----------------------------- rendu UI -----------------------------
  const renderMessage = ({ item }: { item: Message }) => {
    const isClient = item.expediteurId === user?.uid;
    return (
      <View style={[styles.messageContainer, isClient ? styles.messageClient : styles.messageAidant]}>
        <Text style={[styles.messageTexte, isClient && styles.messageTexteClient]}>{item.texte}</Text>
        <Text style={[styles.messageHeure, isClient && styles.messageHeureClient]}>
          {formatHeure((item as any).timestamp)}
        </Text>
      </View>
    );
  };

  const renderEtoiles = () => (
    <View style={styles.etoilesContainer}>
      {[1, 2, 3, 4, 5].map((etoile) => (
        <TouchableOpacity key={etoile} onPress={() => setEvaluation(etoile)} style={styles.etoileButton}>
          <Text style={[styles.etoile, etoile <= evaluation ? styles.etoilePleine : styles.etoileVide]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Vérification directe si la durée est < 2h avec useMemo
  const isServiceUnavailable = useMemo(() => {
    if (stableParams.heureDebut && stableParams.heureFin) {
      const start = stableParams.heureDebut;
      const end = stableParams.heureFin;
      
      try {
        // Calcul simple de la durée
        const startHour = parseInt(start.replace(/[h:]/g, '').substring(0, 2));
        const startMin = parseInt(start.replace(/[h:]/g, '').substring(2, 4) || '0');
        const endHour = parseInt(end.replace(/[h:]/g, '').substring(0, 2));
        const endMin = parseInt(end.replace(/[h:]/g, '').substring(2, 4) || '0');
        
        const durationHours = (endHour + endMin/60) - (startHour + startMin/60);
        return durationHours < 2;
      } catch (error) {
        console.log('Erreur calcul durée:', error);
        return false;
      }
    }
    return false;
  }, [stableParams.heureDebut, stableParams.heureFin]);

  const renderTarificationInfo = () => {
    console.log('🔍 Debug renderTarificationInfo:', { 
      pricingError, 
      pricingData: !!pricingData,
      serviceUnavailable: isServiceUnavailable,
      heureDebut: stableParams.heureDebut,
      heureFin: stableParams.heureFin
    });
    
    // Afficher l'erreur si service indisponible (< 2h)
    if (isServiceUnavailable || pricingError) {
      console.log('🚨 Service indisponible - durée < 2h');
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Service indisponible</Text>
          <Text style={styles.errorMessage}>
            Durée minimum de 2 heures requise pour nos services.
          </Text>
          <Text style={styles.errorHint}>
            Créneau actuel : {stableParams.heureDebut} - {stableParams.heureFin}
          </Text>
          <Text style={styles.errorHint}>
            Veuillez sélectionner un créneau d&apos au moins 2 heures consécutives.
          </Text>
        </View>
      );
    }
    
    if (!pricingData) {
      console.log('🔍 Pas de pricingData, pas d\'affichage');
      return null;
    }
    return (
      <View style={styles.tarificationContainer}>
        <Text style={styles.tarificationTitle}>💰 Tarification</Text>
        <View style={styles.tarificationDetails}>
          <View style={styles.tarificationRow}>
            <Text style={styles.tarificationLabel}>Durée :</Text>
            <Text style={styles.tarificationValue}>{pricingData.hours}h</Text>
          </View>

          {pricingData.discount > 0 && (
            <>
              <View style={styles.tarificationRow}>
                <Text style={styles.tarificationLabel}>Prix normal :</Text>
                <Text style={[styles.tarificationValue, styles.prixBarre]}>
                  {PricingService.formatPrice(pricingData.basePrice)}
                </Text>
              </View>
              <View style={styles.tarificationRow}>
                <Text style={styles.reductionLabel}>Réduction :</Text>
                <Text style={styles.reductionValue}>-{PricingService.formatPrice(pricingData.discount)}</Text>
              </View>
            </>
          )}

          <View style={[styles.tarificationRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total :</Text>
            <Text style={styles.totalValue}>{PricingService.formatPrice(pricingData.finalPrice)}</Text>
          </View>

          {/* acompte & solde */}
          <View style={styles.tarificationRow}>
            <Text style={styles.acompteLabel}>Acompte (20%) :</Text>
            <Text style={styles.acompteValue}>{fmt(getAcompteAmount())}</Text>
          </View>
          <View style={styles.tarificationRow}>
            <Text style={styles.tarificationLabel}>Reste à payer :</Text>
            <Text style={styles.tarificationValue}>{fmt(getMontantRestant())}</Text>
          </View>

          {pricingData.discount > 0 && (
            <Text style={styles.economieText}>
              🎉 Vous économisez {PricingService.formatPrice(pricingData.discount)} !
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderContenuPrincipal = () => {
    if (!isConversationReady) {
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Chargement de la conversation...</Text>
        </View>
      );
    }
    
    switch (etapeActuelle) {
      case ETAPES.CONVERSATION:
        return (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            {renderTarificationInfo()}
            
            <TouchableOpacity 
              style={[styles.confirmerButton, (pricingError || isServiceUnavailable) && styles.buttonDisabled]} 
              onPress={() => {
                console.log('🔍 Bouton cliqué:', { pricingError, unavailable: isServiceUnavailable });
                if (!pricingError && !isServiceUnavailable) {
                  setShowConfirmationModal(true);
                }
              }}
              disabled={!!(pricingError || isServiceUnavailable)}
            >
              <Text style={[styles.confirmerButtonText, (pricingError || isServiceUnavailable) && styles.buttonTextDisabled]}>
                {(pricingError || isServiceUnavailable) ? '⚠️ Service non disponible' : '✅ Confirmer le service'}
              </Text>
            </TouchableOpacity>
            {/* Debug info */}
            <Text style={{ fontSize: 10, color: '#666', textAlign: 'center', marginTop: 5 }}>
              Debug: Durée moins de 2h = {isServiceUnavailable ? 'OUI' : 'NON'}
            </Text>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={nouveauMessage}
                  onChangeText={setNouveauMessage}
                  placeholder="Tapez votre message…"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity onPress={envoyerMessage} style={styles.sendButton} disabled={loading}>
                  <Text style={styles.sendButtonText}>{loading ? '…' : '📤'}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </>
        );
        
      case ETAPES.ATTENTE_SERVICE:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>⏳ Service confirmé</Text>
            <Text style={styles.etapeDescription}>
              L&apos;acompte a été versé avec succès.{'\n'}
              Le service est prévu le {stableParams.jour} de {stableParams.heureDebut} à {stableParams.heureFin}.
            </Text>
            {adresseService ? (
              <View style={styles.adresseConfirmee}>
                <Text style={styles.adresseLabel}>📍 Adresse du service :</Text>
                <Text style={styles.adresseTexte}>{adresseService}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.terminerButton} onPress={terminerService}>
              <Text style={styles.buttonText}>✅ Terminer le service</Text>
            </TouchableOpacity>
            <Text style={styles.infoText}>
              Cliquez sur Terminer le service une fois que le service a été réalisé.
            </Text>
          </View>
        );
        
      case ETAPES.EVALUATION:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.etapeTitle}>⭐ Évaluez le service</Text>
            <Text style={styles.etapeDescription}>
              Comment s&apos;est passé le service avec {stableParams.profileName} ?
            </Text>
            {renderEtoiles()}
            <TouchableOpacity style={styles.evaluerButton} onPress={confirmerEvaluation} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Chargement...' : 'Confirmer'}</Text>
            </TouchableOpacity>
          </View>
        );
        
      case ETAPES.AVIS_OBLIGATOIRE:
        return (
          <ScrollView contentContainerStyle={styles.avisContainer}>
            <Text style={styles.etapeTitle}>📝 Avis détaillé requis</Text>
            <Text style={styles.etapeDescription}>
              Un avis est obligatoire pour une note inférieure à 3 étoiles.
            </Text>
            {renderEtoiles()}
            <TextInput
              style={styles.avisInput}
              value={avisTexte}
              onChangeText={setAvisTexte}
              placeholder="Décrivez votre expérience…"
              multiline
            />
            <TouchableOpacity style={styles.confirmerAvisButton} onPress={confirmerAvis} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Envoi...' : 'Envoyer l\'avis'}</Text>
            </TouchableOpacity>
          </ScrollView>
        );
        
      default:
        return (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        );
    }
  };

  // Styles dynamiques avec le thème
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      marginBottom: Platform.OS === 'android' ? 0 : 0,
    },
    header: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      padding: 20,
      paddingTop: Platform.OS === 'android' ? 10 : 15,
    },
    backButtonTouchable: {
      paddingVertical: 8,
      paddingHorizontal: 5,
      marginBottom: 5,
      alignSelf: 'flex-start',
    },
    backButton: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginTop: 5 },
    headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 5 },
    headerPrice: { fontSize: 12, color: theme.primary, fontWeight: '600', marginTop: 3 },
    headerSubPrice: { fontSize: 12, color: '#856404', fontWeight: '600', marginTop: 2 },
    messagesList: { flex: 1, paddingHorizontal: 15, paddingVertical: 10 },
    messageContainer: { padding: 12, marginVertical: 5, borderRadius: 18, maxWidth: '80%' },
    messageClient: { alignSelf: 'flex-end', backgroundColor: theme.primary },
    messageAidant: { alignSelf: 'flex-start', backgroundColor: theme.surface },
    messageTexte: { fontSize: 16, lineHeight: 22, color: theme.text },
    messageTexteClient: { color: '#ffffff' },
    messageHeure: { fontSize: 12, color: theme.textSecondary, marginTop: 5, textAlign: 'right' },
    messageHeureClient: { color: 'rgba(255,255,255,0.7)' },
    tarificationContainer: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      padding: 15,
      margin: 15,
    },
    tarificationTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 10 },
    tarificationDetails: {},
    tarificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    errorContainer: {
      backgroundColor: '#fff5f5',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#dc2626',
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 14,
      color: '#dc2626',
      marginBottom: 8,
    },
    errorHint: {
      fontSize: 13,
      color: '#6b7280',
      fontStyle: 'italic',
    },
    tarificationLabel: { fontSize: 14, color: theme.textSecondary },
    tarificationValue: { fontSize: 14, fontWeight: '500', color: theme.text },
    prixBarre: { textDecorationLine: 'line-through', color: theme.textSecondary },
    reductionLabel: { fontSize: 14, color: '#28a745', fontWeight: '500' },
    reductionValue: { fontSize: 14, color: '#28a745', fontWeight: 'bold' },
    totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    totalValue: { fontSize: 16, fontWeight: 'bold', color: theme.primary },
    economieText: { textAlign: 'center', marginTop: 8, fontSize: 12, color: '#28a745', fontWeight: '500' },
    acompteDetails: { backgroundColor: '#fff3cd', padding: 15, borderRadius: 8, marginBottom: 15 },
    acompteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    acompteLabel: { fontSize: 14, color: '#856404' },
    acompteValue: { fontSize: 14, fontWeight: '500', color: '#856404' },
    acompteAmount: { fontSize: 16, fontWeight: 'bold', color: theme.primary },
    inputContainer: {
      flexDirection: 'row',
      padding: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginRight: 10,
      maxHeight: 100,
      color: theme.text,
    },
    sendButton: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
    centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.textSecondary },
    attenteTitre: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 20 },
    attenteDescription: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
    adresseInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: theme.text,
      marginBottom: 20,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    confirmerButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 15,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    evaluationTitre: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 10 },
    evaluationDescription: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 30 },
    etoilesContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
    etoile: { fontSize: 48, marginHorizontal: 8 },
    etoileVide: { fontSize: 48, marginHorizontal: 8, color: '#ddd' },
    confirmerEvaluationButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 15,
      alignItems: 'center',
    },
    avisObligatoireTitre: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 10 },
    avisObligatoireDescription: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
    avisInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: theme.text,
      marginBottom: 20,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    confirmerAvisButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 15,
      alignItems: 'center',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15, textAlign: 'center' },
    modalDescription: { fontSize: 16, color: theme.textSecondary, marginBottom: 20, textAlign: 'center', lineHeight: 24 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    modalCancelButton: { flex: 1, borderRadius: 8, paddingVertical: 15, marginRight: 10, backgroundColor: theme.border, alignItems: 'center' },
    modalConfirmButton: { flex: 1, borderRadius: 8, paddingVertical: 15, marginLeft: 10, backgroundColor: theme.primary, alignItems: 'center' },
    modalCancelText: { color: theme.textSecondary, fontSize: 16, fontWeight: '500' },
    modalConfirmText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    adresseConfirmee: { backgroundColor: theme.surface, padding: 15, borderRadius: 8, marginBottom: 20, width: '100%' },
    adresseLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 5 },
    adresseTexte: { fontSize: 15, color: theme.text, lineHeight: 20 },
    infoText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
    modalPricingSection: { backgroundColor: theme.background, padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
    modalPricingTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 10 },
    modalPricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalPricingLabel: { fontSize: 14, color: theme.textSecondary },
    modalPricingValue: { fontSize: 14, fontWeight: '500', color: theme.text },
    modalCommissionSection: { backgroundColor: '#e8f4f8', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#b3d9e6' },
    modalCommissionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0c5d7a', marginBottom: 10 },
    modalCommissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalCommissionLabel: { fontSize: 14, color: '#0c5d7a', flex: 1 },
    modalCommissionValue: { fontSize: 14, fontWeight: 'bold', color: theme.primary },
    etoileButton: { padding: 5 },
    etoilePleine: { color: '#ffd700' },
    buttonDisabled: { opacity: 0.5 },
    confirmerButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    buttonTextDisabled: { color: '#cccccc' },
    messageInput: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 15, fontSize: 16, color: theme.text, marginBottom: 15, minHeight: 80, textAlignVertical: 'top' },
    etapeTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 15 },
    etapeDescription: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 24 },
    terminerButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginBottom: 15 },
    evaluerButton: { backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
    avisContainer: { backgroundColor: theme.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  }), [theme]);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: Platform.OS === 'android' ? 15 : 0 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={retournerEnArriere}
          style={styles.backButtonTouchable}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>💬 {stableParams.profileName || ''}</Text>

        <Text style={styles.headerSubtitle}>
          {stableParams.secteur || ''} • {stableParams.jour || ''} ({stableParams.heureDebut || ''} - {stableParams.heureFin || ''})
        </Text>

        {pricingData && (
          <>
            <Text style={styles.headerPrice}>
              Prix : {PricingService.formatPrice(pricingData.finalPrice)}
              {pricingData.discount > 0 &&
                ` (économie : ${PricingService.formatPrice(pricingData.discount)})`}
            </Text>

            {/* acompte + solde dans le header */}
            <Text style={styles.headerSubPrice}>
              Acompte : {fmt(getAcompteAmount())} • Reste : {fmt(getMontantRestant())}
            </Text>
          </>
        )}
      </View>

      {renderContenuPrincipal()}
      
      {/* Modal confirmation adresse */}
      <Modal visible={showConfirmationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Confirmer le service</Text>
            {pricingData && (
              <>
                <View style={styles.modalPricingSection}>
                  <Text style={styles.modalPricingTitle}>💰 Récapitulatif</Text>
                  <View style={styles.modalPricingRow}>
                    <Text style={styles.modalPricingLabel}>Service :</Text>
                    <Text style={styles.modalPricingValue}>{pricingData.hours}h</Text>
                  </View>
                  {pricingData.discount > 0 && (
                    <>
                      <View style={styles.modalPricingRow}>
                        <Text style={styles.modalPricingLabel}>Prix normal :</Text>
                        <Text style={[styles.modalPricingValue, styles.prixBarre]}>
                          {PricingService.formatPrice(pricingData.basePrice)}
                        </Text>
                      </View>
                      <View style={styles.modalPricingRow}>
                        <Text style={styles.modalPricingLabel}>Réduction :</Text>
                        <Text style={styles.reductionValue}>
                          -{PricingService.formatPrice(pricingData.discount)}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={[styles.modalPricingRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total :</Text>
                    <Text style={styles.totalValue}>{PricingService.formatPrice(pricingData.finalPrice)}</Text>
                  </View>
                </View>

                {/* Commission 60/40 (informatif) */}
                <View style={styles.modalCommissionSection}>
                  <Text style={styles.modalCommissionTitle}>💼 Répartition après service</Text>
                  <View style={styles.modalCommissionRow}>
                    <Text style={styles.modalCommissionLabel}>👤 L&apos;aidant recevra (60%) :</Text>
                    <Text style={styles.modalCommissionValue}>{fmt(getMontantAidant())}</Text>
                  </View>
                  <View style={styles.modalCommissionRow}>
                    <Text style={styles.modalCommissionLabel}>🏢 Commission plateforme (40%) :</Text>
                    <Text style={styles.modalCommissionValue}>{fmt(getCommissionPlateforme())}</Text>
                  </View>
                </View>
              </>
            )}
            <Text style={styles.modalDescription}>
              Veuillez saisir l&apos;adresse où le service doit être réalisé :
            </Text>
            <TextInput
              style={styles.adresseInput}
              value={adresseService}
              onChangeText={setAdresseService}
              placeholder="123 Rue de la Paix, 75001 Paris"
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmationModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmerService}>
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal acompte */}
      <Modal visible={showAcompteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Acompte de confirmation</Text>
            {pricingData && (
              <View style={styles.acompteDetails}>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Montant total :</Text>
                  <Text style={styles.acompteValue}>
                    {PricingService.formatPrice(pricingData.finalPrice)}
                  </Text>
                </View>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Acompte (20%) :</Text>
                  <Text style={styles.acompteAmount}>{fmt(getAcompteAmount())}</Text>
                </View>
                <View style={styles.acompteRow}>
                  <Text style={styles.acompteLabel}>Reste à payer :</Text>
                  <Text style={styles.acompteValue}>{fmt(getMontantRestant())}</Text>
                </View>
              </View>
            )}
            <Text style={styles.modalDescription}>
              L&apos;acompte confirme votre réservation et sera déduit du montant total.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcompteModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={payerAcompte} disabled={loading}>
                <Text style={styles.modalConfirmText}>
                  {loading ? 'Paiement…' : `Payer ${fmt(getAcompteAmount())}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

