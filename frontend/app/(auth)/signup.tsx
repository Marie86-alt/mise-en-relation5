// app/(auth)/signup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import ErrorService from '@/src/services/errorService';
import type { ThemeColors } from '@/constants/themes';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Role = 'client' | 'aidant';

const ROLES: { value: Role; icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    value: 'client',
    icon: 'search-outline',
    title: "Je cherche de l'aide",
    description: 'Pour un proche ou pour moi : trouver un aidant vérifié près de chez moi.',
  },
  {
    value: 'aidant',
    icon: 'hand-left-outline',
    title: 'Je propose mon aide',
    description: 'Je suis aidant(e) à domicile et je souhaite recevoir des demandes.',
  },
];

export default function SignupScreen() {
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signUp, user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  const validateForm = (): string | null => {
    if (!role) return "Indiquez si vous cherchez de l'aide ou si vous en proposez.";
    if (!displayName.trim()) return 'Veuillez indiquer votre nom et prénom.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Veuillez saisir une adresse e-mail valide.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }
    if (password !== confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError, 'Vérifiez le formulaire');
      return;
    }

    setIsLoading(true);
    try {
      const isAidant = role === 'aidant';
      await signUp(email.trim(), password, { displayName: displayName.trim(), isAidant });
      // La redirection vers les onglets est gérée par RootLayoutNav dès que `user` est défini.
      toast.success(
        isAidant
          ? `Bienvenue ${displayName.trim()} ! Complétez votre profil aidant pour être visible après validation.`
          : `Bienvenue ${displayName.trim()} !`,
        'Compte créé'
      );
    } catch (error: any) {
      ErrorService.logError('SIGNUP_ERROR', error?.message ?? 'Signup failed', error?.code, 'error');
      toast.error(ErrorService.handleFirebaseError(error), 'Inscription impossible');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Inscription</Text>
            <Text style={styles.subtitle}>Créez votre compte en une minute</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vous êtes… *</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const selected = role === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      onPress={() => setRole(r.value)}
                      disabled={isLoading}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${r.title}. ${r.description}`}
                      style={({ pressed }) => [
                        styles.roleCard,
                        selected && styles.roleCardSelected,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons name={r.icon} size={26} color={selected ? theme.primary : theme.textSecondary} />
                      <Text style={[styles.roleTitle, selected && { color: theme.primary }]}>{r.title}</Text>
                      <Text style={styles.roleDescription}>{r.description}</Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={styles.roleCheck} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom et prénom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex. : Marie Payet"
                placeholderTextColor={theme.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
                autoComplete="name"
                textContentType="name"
                editable={!isLoading}
                accessibilityLabel="Nom et prénom"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse e-mail *</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isLoading}
                accessibilityLabel="Adresse e-mail"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, passwordTooShort && styles.inputError]}
                  placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!isLoading}
                  accessibilityLabel="Mot de passe"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
              {passwordTooShort ? (
                <Text style={styles.helperError}>Encore {MIN_PASSWORD_LENGTH - password.length} caractère(s) minimum.</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <TextInput
                style={[styles.input, passwordsMismatch && styles.inputError]}
                placeholder="Répétez votre mot de passe"
                placeholderTextColor={theme.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!isLoading}
                onSubmitEditing={handleSignup}
                returnKeyType="done"
                accessibilityLabel="Confirmation du mot de passe"
              />
              {passwordsMismatch ? (
                <Text style={styles.helperError}>Les mots de passe ne correspondent pas.</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.signupButtonText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={isLoading} accessibilityRole="link">
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    header: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 32, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 8 },
    form: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 },
    roleRow: { gap: 10 },
    roleCard: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      backgroundColor: theme.background,
      gap: 6,
      minHeight: 88,
    },
    roleCardSelected: { borderColor: theme.primary, backgroundColor: theme.surfaceSecondary },
    roleTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
    roleDescription: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
    roleCheck: { position: 'absolute', top: 12, right: 12 },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
      minHeight: 48,
    },
    inputError: { borderColor: theme.danger },
    helperError: { color: theme.danger, fontSize: 13, marginTop: 6 },
    passwordRow: { flexDirection: 'row', alignItems: 'center' },
    passwordInput: { flex: 1, paddingRight: 48 },
    eyeButton: {
      position: 'absolute',
      right: 4,
      height: 48,
      width: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signupButton: {
      backgroundColor: theme.primary,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 4,
      minHeight: 52,
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    signupButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 20, paddingBottom: 20 },
    footerText: { color: theme.textSecondary, fontSize: 16, marginBottom: 5 },
    loginLink: { color: theme.primary, fontSize: 18, fontWeight: '600', paddingVertical: 6 },
  });
