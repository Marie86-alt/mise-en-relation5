// components/conversation/ServiceStepper.tsx
// Barre d'étapes du parcours d'un service : l'étape courante est DÉRIVÉE du statut Firestore
// de la conversation, jamais d'un état local — l'utilisateur retrouve donc toujours où il en est.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { StatutServiceType } from '@/src/services/firebase/chatService';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type StepKey = 'contact' | 'acompte' | 'service' | 'evaluation' | 'solde';

export const STEPS: { key: StepKey; label: string; icon: IoniconName }[] = [
  { key: 'contact', label: 'Contact', icon: 'chatbubbles-outline' },
  { key: 'acompte', label: 'Acompte', icon: 'card-outline' },
  { key: 'service', label: 'Service', icon: 'home-outline' },
  { key: 'evaluation', label: 'Avis', icon: 'star-outline' },
  { key: 'solde', label: 'Solde', icon: 'checkmark-done-outline' },
];

/** Index de l'étape courante (0..4) ; STEPS.length quand tout est terminé. */
export function stepIndexForStatus(status: StatutServiceType | undefined): number {
  switch (status) {
    case 'acompte_en_cours':
      return 1;
    case 'acompte_paye':
    case 'en_cours':
      return 2;
    case 'evaluation':
      return 3;
    case 'termine':
      return STEPS.length;
    case 'conversation':
    case 'service_confirme':
    default:
      return 0;
  }
}

interface Props {
  status: StatutServiceType | undefined;
}

export function ServiceStepper({ status }: Props) {
  const { theme } = useTheme();
  const current = stepIndexForStatus(status);

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Étape ${Math.min(current + 1, STEPS.length)} sur ${STEPS.length}`}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const circleBg = done || active ? theme.primary : theme.surface;
        const circleBorder = done || active ? theme.primary : theme.border;
        const iconColor = done || active ? '#ffffff' : theme.textTertiary;
        const etat = done ? 'terminée' : active ? 'en cours' : 'à venir';

        return (
          <React.Fragment key={step.key}>
            {i > 0 ? <View style={[styles.connector, { backgroundColor: i <= current ? theme.primary : theme.border }]} /> : null}
            <View style={styles.step} accessibilityLabel={`${step.label}, ${etat}`}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: circleBg, borderColor: circleBorder },
                  active && styles.circleActive,
                ]}
              >
                <Ionicons name={done ? 'checkmark' : step.icon} size={16} color={iconColor} />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: active ? theme.primary : done ? theme.text : theme.textTertiary },
                  active && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, paddingVertical: 12 },
  step: { alignItems: 'center', width: 56 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { transform: [{ scale: 1.12 }] },
  connector: { flex: 1, height: 2, marginTop: 15, marginHorizontal: -6 },
  label: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
});
