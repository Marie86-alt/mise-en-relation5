import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatService, Message } from '@/src/services/firebase/chatService';
import { avisService } from '@/src/services/firebase/avisService';
import { PricingService, PricingResult } from '@/src/utils/pricing';
import ErrorService from '@/src/services/errorService';

export interface ConversationParams {
    profileId: string;
    profileName: string;
    secteur: string;
    jour: string;
    heureDebut: string;
    heureFin: string;
}

export type EtapeType = 'conversation' | 'attente_service' | 'evaluation' | 'avis_obligatoire';

const ETAPES: Record<string, EtapeType> = {
    CONVERSATION: 'conversation',
    ATTENTE_SERVICE: 'attente_service',
    EVALUATION: 'evaluation',
    AVIS_OBLIGATOIRE: 'avis_obligatoire',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const useConversationLogic = (stableParams: ConversationParams) => {
    const router = useRouter();
    const { user } = useAuth();

    const [etapeActuelle, setEtapeActuelle] = useState<EtapeType>(ETAPES.CONVERSATION);
    const [messages, setMessages] = useState<Message[]>([]);
    const [nouveauMessage, setNouveauMessage] = useState('');
    const [adresseService, setAdresseService] = useState('');
    const [evaluation, setEvaluation] = useState(0);
    const [avisTexte, setAvisTexte] = useState('');
    const [loading, setLoading] = useState(false);
    const [pricingData, setPricingData] = useState<PricingResult | null>(null);
    const [isConversationReady, setIsConversationReady] = useState(false);
    const [pricingError, setPricingError] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [showAcompteModal, setShowAcompteModal] = useState(false);

    const flatListRef = useRef(null);
    const conversationId = user && stableParams.profileId
      ? chatService.getConversationId(user.uid, stableParams.profileId)
          : null;

    useEffect(() => {
          if (stableParams.heureDebut && stableParams.heureFin) {
        try {
                  const result = PricingService.calculatePriceFromTimeRangeSafe(
                              stableParams.heureDebut,
                              stableParams.heureFin,
                              1
                            );
                  if (result.error) {
                              setPricingError(result.error);
                              setPricingData(null);
                              ErrorService.logError('PRICING_ERROR', result.error, 'initialization', 'warning');
                  } else {
                      setPricingData(result);
                              setPricingError(null);
                  }
        } catch (error: any) {
                  ErrorService.logError('PRICING_CALC_ERROR', error.message, 'useEffect', 'error');
        }
          }
    }, [stableParams.heureDebut, stableParams.heureFin]);

    const getAcompteAmount = useCallback(() => {
          if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
          return round2(pricingData.finalPrice * 0.2);
    }, [pricingData]);

    const getMontantRestant = useCallback(() => {
          if (!pricingData || isNaN(pricingData.finalPrice)) return 0;
          return round2(pricingData.finalPrice - getAcompteAmount());
    }, [pricingData, getAcompteAmount]);

    const retournerEnArriere = useCallback(() => {
          try {
                  if (router.canGoBack()) {
                            router.back();
                  } else {
                            router.replace('/(tabs)');
                  }
          } catch (error: any) {
                  ErrorService.logError('NAVIGATION_ERROR', error.message, 'retournerEnArriere', 'error');
                  router.replace('/(tabs)');
          }
    }, [router]);

    return {
          etapeActuelle,
          setEtapeActuelle,
          messages,
          nouveauMessage,
          setNouveauMessage,
          adresseService,
          setAdresseService,
          evaluation,
          setEvaluation,
          avisTexte,
          setAvisTexte,
          loading,
          pricingData,
          isConversationReady,
          pricingError,
          showConfirmationModal,
          setShowConfirmationModal,
          showAcompteModal,
          setShowAcompteModal,
          flatListRef,
          getAcompteAmount,
          getMontantRestant,
          ETAPES,
          retournerEnArriere,
    };
};
