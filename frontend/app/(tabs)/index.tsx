// app/(tabs)/index.tsx — Recherche d'un aidant
// Plus aucune saisie au clavier : date, heure de début et durée se choisissent par pastilles.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Chip } from '@/components/ui/Chip';
import { PricingService } from '@/src/utils/pricing';
import type { ThemeColors } from '@/constants/themes';

// ---------- Paramètres de la recherche ----------
const SECTEURS = [
  'Aide au repas',
  'Dame de compagnie',
  'Soins légers et assistance',
  'Stimulation cognitive (jeux, lecture)',
  'Accompagnement (sorties, promenades)',
  'Autre',
];
const NB_JOURS_PROPOSES = 30;
const PREMIER_CRENEAU_MIN = 7 * 60; // 07h00
const DERNIER_CRENEAU_MIN = 20 * 60; // dernier début possible : 20h00
const FIN_MAX_MIN = 23 * 60; // un service se termine au plus tard à 23h00
const PAS_CRENEAU_MIN = 30;
const DUREES_HEURES = [2, 3, 4, 5, 6, 8];

// Valeurs stockées inchangées ('Femme' | 'Homme' | 'Indifférent') pour rester compatibles
// avec profileFilters et les écrans suivants ; seuls les libellés changent.
const CHOIX_PERSONNE = [
  { value: 'Femme', label: 'Une femme' },
  { value: 'Homme', label: 'Un homme' },
  { value: 'Indifférent', label: 'Je préfère ne pas préciser' },
];
const CHOIX_AIDANT = [
  { value: 'Femme', label: 'Une femme' },
  { value: 'Homme', label: 'Un homme' },
  { value: 'Indifférent', label: 'Peu importe' },
];

// ---------- Helpers date / heure (sans Intl, pour un rendu identique sur tous les appareils) ----------
const JOURS_COURTS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Format attendu par le reste de l'app : JJ/MM/AAAA */
const formatJourParam = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
/** Format attendu par PricingService : 10h00 */
const formatHeure = (minutes: number) => `${pad2(Math.floor(minutes / 60))}h${pad2(minutes % 60)}`;
const formatEuros = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
const dateCourte = (d: Date) => `${JOURS_COURTS[d.getDay()]} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;

const buildJours = (): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: NB_JOURS_PROPOSES }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
};

const labelJour = (d: Date, index: number) => {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return 'Demain';
  return dateCourte(d);
};

const buildCreneaux = (): number[] => {
  const slots: number[] = [];
  for (let m = PREMIER_CRENEAU_MIN; m <= DERNIER_CRENEAU_MIN; m += PAS_CRENEAU_MIN) slots.push(m);
  return slots;
};

/** Minutes écoulées aujourd'hui + marge : en dessous, le créneau est considéré passé. */
const minutesLimiteAujourdhui = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + 30;
};

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [secteur, setSecteur] = useState<string | null>(null);
  const [jourIndex, setJourIndex] = useState<number | null>(null);
  const [debutMin, setDebutMin] = useState<number | null>(null);
  const [dureeH, setDureeH] = useState<number | null>(null);
  const [personneAidee, setPersonneAidee] = useState<string | null>(null);
  const [preferenceAidant, setPreferenceAidant] = useState<string | null>(null);

  const jours = useMemo(buildJours, []);
  const creneaux = useMemo(buildCreneaux, []);

  // Pour aujourd'hui, on masque les créneaux déjà passés.
  const creneauxDisponibles = useMemo(() => {
    if (jourIndex !== 0) return creneaux;
    const limite = minutesLimiteAujourdhui();
    return creneaux.filter((m) => m >= limite);
  }, [creneaux, jourIndex]);

  const finMin = debutMin !== null && dureeH !== null ? debutMin + dureeH * 60 : null;
  const pricing = dureeH !== null ? PricingService.calculatePrice(dureeH) : null;

  const selectJour = (index: number) => {
    setJourIndex(index);
    if (index === 0 && debutMin !== null && debutMin < minutesLimiteAujourdhui()) {
      setDebutMin(null);
    }
  };

  const selectDebut = (m: number) => {
    setDebutMin(m);
    if (dureeH !== null && m + dureeH * 60 > FIN_MAX_MIN) setDureeH(null);
  };

  const handleSubmit = () => {
    const manquants: string[] = [];
    if (!secteur) manquants.push("le type d'aide");
    if (jourIndex === null) manquants.push('la date');
    if (debutMin === null) manquants.push("l'heure de début");
    if (dureeH === null) manquants.push('la durée');
    if (!personneAidee) manquants.push('la personne à accompagner');
    if (!preferenceAidant) manquants.push("votre préférence d'aidant");

    if (manquants.length > 0 || !secteur || jourIndex === null || debutMin === null || finMin === null) {
      Alert.alert('Il manque une information', `Merci de choisir ${manquants.join(', ')}.`);
      return;
    }

    router.push({
      pathname: '/profile-list',
      params: {
        secteur,
        jour: formatJourParam(jours[jourIndex]),
        heureDebut: formatHeure(debutMin),
        heureFin: formatHeure(finMin),
        etatCivilPersonne: personneAidee ?? '',
        preferenceAidant: preferenceAidant ?? '',
      },
    });
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            Alert.alert('Erreur', 'La déconnexion a échoué. Réessayez.');
          }
        },
      },
    ]);
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const FieldLabel = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
    <View style={styles.labelRow}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <Text style={styles.label}>{text}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* En-tête (le titre « Accueil » est déjà dans la barre native) */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Bonjour,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user.displayName || user.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Trouvez l&apos;aide qu&apos;il vous faut</Text>
        <Text style={styles.subtitle}>Quelques choix suffisent, aucune saisie à faire.</Text>
      </View>

      {/* 1. Type d'aide */}
      <View style={styles.section}>
        <FieldLabel icon="hand-left-outline" text="Quel type d'aide recherchez-vous ?" />
        <View style={styles.wrapRow}>
          {SECTEURS.map((s) => (
            <Chip key={s} label={s} selected={secteur === s} onPress={() => setSecteur(s)} />
          ))}
        </View>
      </View>

      {/* 2. Date */}
      <View style={styles.section}>
        <FieldLabel icon="calendar-outline" text="Quel jour ?" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {jours.map((d, i) => (
            <Chip
              key={d.toISOString()}
              label={labelJour(d, i)}
              sublabel={i < 2 ? dateCourte(d) : undefined}
              selected={jourIndex === i}
              onPress={() => selectJour(i)}
              accessibilityLabel={`${labelJour(d, i)}, ${formatJourParam(d)}`}
            />
          ))}
        </ScrollView>
      </View>

      {/* 3. Heure de début */}
      <View style={styles.section}>
        <FieldLabel icon="time-outline" text="À quelle heure commencer ?" />
        {creneauxDisponibles.length === 0 ? (
          <Text style={styles.hintText}>Plus de créneau disponible aujourd&apos;hui : choisissez un autre jour.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {creneauxDisponibles.map((m) => (
              <Chip key={m} label={formatHeure(m)} selected={debutMin === m} onPress={() => selectDebut(m)} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 4. Durée (le prix s'affiche directement) */}
      <View style={styles.section}>
        <FieldLabel icon="hourglass-outline" text="Pour combien de temps ?" />
        <View style={styles.wrapRow}>
          {DUREES_HEURES.map((h) => {
            const prix = PricingService.calculatePrice(h);
            const tropTard = debutMin !== null && debutMin + h * 60 > FIN_MAX_MIN;
            return (
              <Chip
                key={h}
                label={`${h} h`}
                sublabel={prix.error ? undefined : formatEuros(prix.finalPrice)}
                selected={dureeH === h}
                disabled={tropTard}
                onPress={() => setDureeH(h)}
              />
            );
          })}
        </View>
        <Text style={styles.hintText}>
          Durée minimum : 2 h. Tarif {formatEuros(PricingService.calculatePrice(2).hourlyRate)} de l&apos;heure.
        </Text>
      </View>

      {/* 5. Personne accompagnée */}
      <View style={styles.section}>
        <FieldLabel icon="person-outline" text="La personne à accompagner est…" />
        <View style={styles.wrapRow}>
          {CHOIX_PERSONNE.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              selected={personneAidee === c.value}
              onPress={() => setPersonneAidee(c.value)}
            />
          ))}
        </View>
      </View>

      {/* 6. Préférence d'aidant */}
      <View style={styles.section}>
        <FieldLabel icon="people-outline" text="Vous préférez un(e) aidant(e)…" />
        <View style={styles.wrapRow}>
          {CHOIX_AIDANT.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              selected={preferenceAidant === c.value}
              onPress={() => setPreferenceAidant(c.value)}
            />
          ))}
        </View>
      </View>

      {/* Récapitulatif */}
      {jourIndex !== null && debutMin !== null && finMin !== null && pricing && !pricing.error ? (
        <View style={styles.summary} accessibilityRole="summary">
          <Ionicons name="checkmark-circle" size={22} color={theme.success} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLine}>
              {labelJour(jours[jourIndex], jourIndex)} · {formatHeure(debutMin)} → {formatHeure(finMin)} ({dureeH} h)
            </Text>
            <Text style={styles.summaryPrice}>
              {formatEuros(pricing.finalPrice)}
              {pricing.discount > 0 ? `  (au lieu de ${formatEuros(pricing.basePrice)})` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} accessibilityRole="button">
        <Ionicons name="search" size={20} color="#ffffff" />
        <Text style={styles.submitButtonText}>Rechercher un aidant</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 32 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    header: {
      backgroundColor: theme.surface,
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    userInfo: { flex: 1, marginRight: 12 },
    welcomeText: { fontSize: 15, color: theme.textSecondary },
    userName: { fontSize: 19, fontWeight: 'bold', color: theme.text },
    logoutButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 15, color: theme.textSecondary },
    section: { paddingHorizontal: 20, paddingTop: 22 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    label: { fontSize: 17, fontWeight: '600', color: theme.text, flex: 1 },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    hRow: { gap: 10, paddingRight: 20 },
    hintText: { color: theme.textTertiary, fontSize: 13, marginTop: 10 },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 24,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryText: { flex: 1 },
    summaryLine: { fontSize: 15, color: theme.text, fontWeight: '600' },
    summaryPrice: { fontSize: 15, color: theme.primary, fontWeight: 'bold', marginTop: 4 },
    submitButton: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 20,
      marginTop: 24,
      minHeight: 56,
    },
    submitButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  });
