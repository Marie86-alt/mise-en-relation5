// app/contact.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';

const CONTACT = {
  name: 'Eva Mounoussamy',
  email: 'mounoussamyeva672@gmail.com',
  phoneDisplay: '+262 693 46 46 76',
  phoneDial: '+262693464676', // pour le lien "tel:"
  phoneDialAlternatives: [
    '+262693464676',
    '0262693464676', 
    '693464676',
    '262693464676'
  ]
};

export default function ContactScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

  const copierEmail = useCallback(async () => {
    await Clipboard.setStringAsync(CONTACT.email);
    toast.success("L'adresse e-mail a été copiée dans le presse-papiers.", 'E-mail copié');
  }, [toast]);

  const copierNumero = useCallback(async () => {
    await Clipboard.setStringAsync(CONTACT.phoneDisplay);
    toast.success('Le numéro a été copié dans le presse-papiers.', 'Numéro copié');
  }, [toast]);

  const handleEmailPress = useCallback(async () => {
    try {
      const url = `mailto:${CONTACT.email}?subject=Contact depuis l'app A La Case Nout Gramoun`;

      // Essayer d'ouvrir directement d'abord
      try {
        await Linking.openURL(url);
        return;
      } catch (error) {
        if (__DEV__) console.log('Ouverture mailto directe échouée :', errorMessage(error));
      }

      // Repli : vérifier qu'une application sait gérer mailto:
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Aucune application e-mail',
          'Vous pouvez nous écrire directement à :\n\n' + CONTACT.email,
          [{ text: "Copier l'adresse", onPress: copierEmail }, { text: 'OK' }]
        );
      }
    } catch (error) {
      if (__DEV__) console.log('❌ Erreur email:', errorMessage(error));
      Alert.alert(
        "Impossible d'ouvrir l'application e-mail",
        'Vous pouvez nous écrire à :\n' + CONTACT.email,
        [{ text: "Copier l'adresse", onPress: copierEmail }, { text: 'OK' }]
      );
    }
  }, [copierEmail]);

  const handlePhonePress = useCallback(async () => {
    // Essayer différents formats de numéros
    for (const phoneNumber of CONTACT.phoneDialAlternatives) {
      const url = `tel:${phoneNumber}`;
      try {
        const can = await Linking.canOpenURL(url);
        if (can) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        if (__DEV__) console.log(`Échec format ${phoneNumber} :`, errorMessage(error));
      }
    }

    // Dernier essai : ouvrir le composeur sans vérification préalable
    try {
      await Linking.openURL(`tel:${CONTACT.phoneDial}`);
      return;
    } catch (dialError) {
      if (__DEV__) console.log('Échec ouverture composeur :', errorMessage(dialError));
    }

    Alert.alert(
      'Application téléphone indisponible',
      'Vous pouvez nous appeler au :\n' + CONTACT.phoneDisplay,
      [{ text: 'Copier le numéro', onPress: copierNumero }, { text: 'OK' }]
    );
  }, [copierNumero]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Avatar + nom */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>EM</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>👋 Contact</Text>
        <Text style={[styles.name, { color: theme.textSecondary }]}>{CONTACT.name}</Text>

        {/* Lignes d'infos */}
        <View style={[styles.infoBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color={Colors.light.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Téléphone</Text>
            <TouchableOpacity onPress={handlePhonePress} style={styles.infoAction} activeOpacity={0.8}>
              <Text style={styles.infoValue}>{CONTACT.phoneDisplay}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color={Colors.light.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>E-mail</Text>
            <TouchableOpacity onPress={handleEmailPress} style={styles.infoAction} activeOpacity={0.8}>
              <Text style={styles.infoValue}>{CONTACT.email}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handlePhonePress} style={[styles.cta, styles.ctaPrimary]} activeOpacity={0.9}>
            <Text style={styles.ctaText}>📞 Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEmailPress} style={[styles.cta, styles.ctaSecondary, { backgroundColor: theme.text }]} activeOpacity={0.9}>
            <Text style={styles.ctaText}>✉️ Écrire</Text>
          </TouchableOpacity>
        </View>

        {/* Petit footer */}
        <Text style={[styles.footer, { color: theme.textSecondary }]}>Nous revenons vers vous au plus vite 💬</Text>
      </View>
    </SafeAreaView>
  );
}

const R = 52;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', padding: 16, justifyContent: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#eef1f4',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  avatar: {
    width: R, height: R, borderRadius: R / 2,
    backgroundColor: '#f0f8ff', // Couleur de fond claire
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarText: { color: Colors.light.primary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },

  title: { fontSize: 22, fontWeight: '800', color: '#1f2d3d', marginTop: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#5b6b7b', marginBottom: 16, marginTop: 2 },

  infoBox: {
    width: '100%',
    backgroundColor: '#fafbff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef1f4',
    padding: 12,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { color: '#6b7682', fontSize: 13, width: 78 },
  infoAction: { flex: 1, alignItems: 'flex-end' },
  infoValue: { color: Colors.light.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#eef1f4', marginVertical: 10 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  cta: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  ctaPrimary: { backgroundColor: Colors.light.primary },
  ctaSecondary: { backgroundColor: '#1f2d3d' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footer: { marginTop: 12, color: '#8b97a3', fontSize: 12, textAlign: 'center' },
});